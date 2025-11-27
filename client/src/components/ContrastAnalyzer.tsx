import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/lib/theme-provider";
import { Check, X, AlertTriangle, Eye, Palette } from "lucide-react";

interface ContrastResult {
  ratio: number;
  aa: boolean;
  aaa: boolean;
  grade: "Pass" | "Fail" | "AA Only";
}

interface ColorPair {
  name: string;
  background: string;
  foreground: string;
  usage: string;
}

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 2/6) {
    r = x; g = c; b = 0;
  } else if (2/6 <= h && h < 3/6) {
    r = 0; g = c; b = x;
  } else if (3/6 <= h && h < 4/6) {
    r = 0; g = x; b = c;
  } else if (4/6 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

// Parse HSL string to numbers
function parseHsl(hslString: string): [number, number, number] {
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return [0, 0, 0];
  return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
}

// Calculate relative luminance
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors
function getContrastRatio(color1: string, color2: string): ContrastResult {
  const [h1, s1, l1] = parseHsl(color1);
  const [h2, s2, l2] = parseHsl(color2);
  
  const [r1, g1, b1] = hslToRgb(h1, s1, l1);
  const [r2, g2, b2] = hslToRgb(h2, s2, l2);
  
  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  const ratio = (lighter + 0.05) / (darker + 0.05);
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= 4.5, // WCAG AA standard
    aaa: ratio >= 7, // WCAG AAA standard
    grade: ratio >= 7 ? "Pass" : ratio >= 4.5 ? "AA Only" : "Fail"
  };
}

// Get CSS custom property value
function getCssVariable(variable: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

export default function ContrastAnalyzer() {
  const { theme } = useTheme();
  const [results, setResults] = useState<{ pair: ColorPair; result: ContrastResult }[]>([]);
  const [overallScore, setOverallScore] = useState<number>(0);

  useEffect(() => {
    // Wait for theme to apply, then analyze
    const timer = setTimeout(() => {
      analyzeContrast();
    }, 100);
    return () => clearTimeout(timer);
  }, [theme]);

  const analyzeContrast = () => {
    const colorPairs: ColorPair[] = [
      {
        name: "Body Text",
        background: getCssVariable('--background'),
        foreground: getCssVariable('--foreground'),
        usage: "Main content text"
      },
      {
        name: "Muted Text",
        background: getCssVariable('--background'),
        foreground: getCssVariable('--muted-foreground'),
        usage: "Secondary text, captions"
      },
      {
        name: "Card Content",
        background: getCssVariable('--card'),
        foreground: getCssVariable('--card-foreground'),
        usage: "Card and panel text"
      },
      {
        name: "Primary Button",
        background: getCssVariable('--primary'),
        foreground: getCssVariable('--primary-foreground'),
        usage: "Button and accent text"
      },
      {
        name: "Secondary Button",
        background: getCssVariable('--secondary'),
        foreground: getCssVariable('--secondary-foreground'),
        usage: "Secondary actions"
      },
      {
        name: "Accent Elements",
        background: getCssVariable('--accent'),
        foreground: getCssVariable('--accent-foreground'),
        usage: "Highlighted content"
      },
      {
        name: "Destructive Actions",
        background: getCssVariable('--destructive'),
        foreground: getCssVariable('--destructive-foreground'),
        usage: "Error messages, delete buttons"
      }
    ];

    const analysisResults = colorPairs.map(pair => ({
      pair,
      result: getContrastRatio(`hsl(${pair.background})`, `hsl(${pair.foreground})`)
    }));

    setResults(analysisResults);

    // Calculate overall score
    const passCount = analysisResults.filter(r => r.result.aa).length;
    const score = Math.round((passCount / analysisResults.length) * 100);
    setOverallScore(score);
  };

  // WCAG AA compliant score colors with dark mode variants
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getResultIcon = (result: ContrastResult) => {
    if (result.aaa) return <Check className="h-4 w-4 text-green-600 dark:text-green-400" />;
    if (result.aa) return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    return <X className="h-4 w-4 text-red-600 dark:text-red-400" />;
  };

  const getResultBadge = (result: ContrastResult) => {
    if (result.aaa) return <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">AAA Pass</Badge>;
    if (result.aa) return <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">AA Pass</Badge>;
    return <Badge variant="destructive">Fail</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Accessibility Contrast Analyzer
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Current theme: <span className="capitalize font-medium">{theme}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Overall Score:</span>
            <span className={`text-lg font-bold ${getScoreColor(overallScore)}`}>
              {overallScore}%
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {results.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getResultIcon(item.result)}
                <div>
                  <div className="font-medium text-sm">{item.pair.name}</div>
                  <div className="text-xs text-muted-foreground">{item.pair.usage}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-mono">
                    {item.result.ratio}:1
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Min: 4.5:1
                  </div>
                </div>
                {getResultBadge(item.result)}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4" />
            WCAG Guidelines
          </h4>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• <strong>AA Standard:</strong> 4.5:1 contrast ratio (minimum for most content)</div>
            <div>• <strong>AAA Standard:</strong> 7:1 contrast ratio (enhanced accessibility)</div>
            <div>• <strong>Large Text:</strong> 3:1 minimum (18pt+ or 14pt+ bold)</div>
          </div>
        </div>

        <Button 
          onClick={analyzeContrast} 
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          Re-analyze Current Theme
        </Button>
      </CardContent>
    </Card>
  );
}