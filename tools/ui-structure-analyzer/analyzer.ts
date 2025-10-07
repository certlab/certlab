import * as fs from 'fs';
import * as parser from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { RouteInfo, ComponentAnalysis } from './types';

export async function parseTypeScriptFile(filePath: string): Promise<TSESTree.Program> {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parser.parse(content, {
    jsx: true,
    loc: true,
    range: true,
    errorOnUnknownASTType: false
  });
}

export async function extractRoutes(appPath: string): Promise<RouteInfo[]> {
  const ast = await parseTypeScriptFile(appPath);
  const routes: RouteInfo[] = [];
  
  // Find Route components in the AST
  walkAST(ast, (node) => {
    if (node.type === 'JSXElement' && 
        node.openingElement.name.type === 'JSXIdentifier' &&
        node.openingElement.name.name === 'Route') {
      
      const routeInfo: RouteInfo = {
        path: '',
        component: ''
      };
      
      // Extract attributes
      node.openingElement.attributes.forEach((attr: any) => {
        if (attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier') {
          const attrName = attr.name.name;
          
          if (attrName === 'path' && attr.value) {
            if (attr.value.type === 'Literal') {
              routeInfo.path = attr.value.value as string;
            } else if (attr.value.type === 'JSXExpressionContainer' && 
                       attr.value.expression.type === 'Literal') {
              routeInfo.path = attr.value.expression.value as string;
            }
          }
          
          if (attrName === 'component' && attr.value) {
            if (attr.value.type === 'JSXExpressionContainer' && 
                attr.value.expression.type === 'Identifier') {
              routeInfo.component = attr.value.expression.name;
            }
          }
        }
      });
      
      if (routeInfo.path && routeInfo.component) {
        routes.push(routeInfo);
      }
    }
  });
  
  return routes;
}

export function analyzeComponent(ast: TSESTree.Program): ComponentAnalysis {
  const analysis: ComponentAnalysis = {
    name: '',
    imports: [],
    hooks: [],
    testIds: [],
    sections: [],
    components: []
  };
  
  // Extract imports
  ast.body.forEach((node) => {
    if (node.type === 'ImportDeclaration') {
      analysis.imports?.push(node.source.value as string);
    }
  });
  
  // Find the main component (default export)
  const defaultExport = ast.body.find(node => 
    node.type === 'ExportDefaultDeclaration'
  ) as TSESTree.ExportDefaultDeclaration | undefined;
  
  if (defaultExport) {
    if (defaultExport.declaration.type === 'FunctionDeclaration' && 
        defaultExport.declaration.id) {
      analysis.name = defaultExport.declaration.id.name;
      analyzeFunction(defaultExport.declaration, analysis);
    } else if (defaultExport.declaration.type === 'Identifier') {
      analysis.name = defaultExport.declaration.name;
      // Find the function declaration
      const funcDecl = ast.body.find(node => 
        node.type === 'FunctionDeclaration' && 
        node.id?.name === analysis.name
      ) as TSESTree.FunctionDeclaration | undefined;
      if (funcDecl) {
        analyzeFunction(funcDecl, analysis);
      }
    }
  }
  
  // Extract auth requirements
  analysis.authRequired = detectAuthRequirement(ast);
  
  // Extract layout classes
  analysis.layout = extractLayoutClasses(ast);
  
  return analysis;
}

function analyzeFunction(
  func: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression,
  analysis: ComponentAnalysis
) {
  walkAST(func.body as any, (node) => {
    // Find React hooks
    if (node.type === 'CallExpression' && 
        node.callee.type === 'Identifier' &&
        node.callee.name.startsWith('use')) {
      analysis.hooks?.push(node.callee.name);
    }
    
    // Find test IDs
    if (node.type === 'JSXAttribute' && 
        node.name.type === 'JSXIdentifier' &&
        node.name.name === 'data-testid' &&
        node.value?.type === 'Literal') {
      analysis.testIds?.push(node.value.value as string);
    }
    
    // Extract sections based on semantic HTML or component names
    if (node.type === 'JSXElement' && node.openingElement.name.type === 'JSXIdentifier') {
      const elementName = node.openingElement.name.name;
      
      // Look for section-like components
      if (['section', 'header', 'main', 'footer', 'nav', 'aside'].includes(elementName.toLowerCase()) ||
          elementName.includes('Section') || elementName.includes('Header') || 
          elementName.includes('Footer') || elementName.includes('Container')) {
        
        const sectionInfo = {
          name: elementName,
          layout: extractClassNames(node.openingElement.attributes),
          components: extractChildComponents(node)
        };
        
        analysis.sections?.push(sectionInfo);
      }
    }
  });
}

function detectAuthRequirement(ast: TSESTree.Program): boolean {
  let hasAuth = false;
  
  walkAST(ast, (node) => {
    if (node.type === 'Identifier' && 
        (node.name === 'isAuthenticated' || 
         node.name === 'useAuth' || 
         node.name === 'currentUser')) {
      hasAuth = true;
    }
  });
  
  return hasAuth;
}

function extractLayoutClasses(ast: TSESTree.Program): string {
  const layoutClasses: string[] = [];
  
  walkAST(ast, (node) => {
    if (node.type === 'JSXAttribute' && 
        node.name.type === 'JSXIdentifier' &&
        node.name.name === 'className' &&
        node.value?.type === 'Literal') {
      const classes = node.value.value as string;
      // Look for layout-related classes
      if (classes.includes('min-h-') || classes.includes('max-w-') || 
          classes.includes('grid') || classes.includes('flex')) {
        layoutClasses.push(classes);
      }
    }
  });
  
  return layoutClasses[0] || 'default';
}

function extractClassNames(attributes: any[]): string {
  for (const attr of attributes) {
    if (attr.type === 'JSXAttribute' && 
        attr.name.type === 'JSXIdentifier' &&
        attr.name.name === 'className' &&
        attr.value?.type === 'Literal') {
      return attr.value.value as string;
    }
  }
  return '';
}

function extractChildComponents(element: any): any[] {
  const components: any[] = [];
  
  if (element.children) {
    element.children.forEach((child: any) => {
      if (child.type === 'JSXElement' && 
          child.openingElement.name.type === 'JSXIdentifier') {
        const name = child.openingElement.name.name;
        // Only track components (PascalCase)
        if (name[0] === name[0].toUpperCase()) {
          components.push({
            name,
            props: extractProps(child.openingElement.attributes)
          });
        }
      }
    });
  }
  
  return components;
}

function extractProps(attributes: any[]): Record<string, any> {
  const props: Record<string, any> = {};
  
  attributes.forEach((attr: any) => {
    if (attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier') {
      const propName = attr.name.name;
      
      if (attr.value) {
        if (attr.value.type === 'Literal') {
          props[propName] = attr.value.value;
        } else if (attr.value.type === 'JSXExpressionContainer') {
          props[propName] = '{expression}';
        }
      } else {
        props[propName] = true; // Boolean prop
      }
    }
  });
  
  return props;
}

function walkAST(node: any, visitor: (node: any) => void) {
  if (!node || typeof node !== 'object') return;
  
  visitor(node);
  
  // Walk through all properties
  for (const key in node) {
    if (key === 'parent' || key === 'range' || key === 'loc') continue;
    
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(item => walkAST(item, visitor));
    } else if (value && typeof value === 'object') {
      walkAST(value, visitor);
    }
  }
}

export async function detectUILibraries(rootDir: string): Promise<string[]> {
  const packageJsonPath = `${process.cwd()}/package.json`;
  const libraries: string[] = [];
  
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    // Check for known UI libraries
    const uiLibraries = [
      '@radix-ui',
      'shadcn',
      '@mui',
      'antd',
      'chakra-ui',
      'tailwindcss',
      'styled-components',
      'emotion'
    ];
    
    for (const lib of uiLibraries) {
      if (Object.keys(deps).some(dep => dep.includes(lib))) {
        libraries.push(lib);
      }
    }
  }
  
  return libraries;
}