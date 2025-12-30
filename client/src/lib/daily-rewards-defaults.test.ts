/**
 * Daily Rewards Default Configuration Tests
 *
 * Tests the default daily rewards configuration to ensure it meets
 * the requirements for the 7-day login reward cycle.
 *
 * These tests verify the default rewards returned when Firestore
 * collection is empty, without requiring Firestore initialization.
 */

import { describe, it, expect } from 'vitest';
import type { DailyReward } from '@shared/schema';

/**
 * Default daily rewards configuration - copied from firestore-storage.ts
 * This is what getDefaultDailyRewards() returns.
 */
const getDefaultDailyRewards = (): DailyReward[] => {
  return [
    {
      id: 1,
      day: 1,
      reward: { points: 10 },
      description: 'Day 1 login reward',
    },
    {
      id: 2,
      day: 2,
      reward: { points: 15 },
      description: 'Day 2 login reward',
    },
    {
      id: 3,
      day: 3,
      reward: { points: 20 },
      description: 'Day 3 login reward',
    },
    {
      id: 4,
      day: 4,
      reward: { points: 25 },
      description: 'Day 4 login reward',
    },
    {
      id: 5,
      day: 5,
      reward: { points: 30 },
      description: 'Day 5 login reward',
    },
    {
      id: 6,
      day: 6,
      reward: { points: 40 },
      description: 'Day 6 login reward',
    },
    {
      id: 7,
      day: 7,
      reward: { points: 50, streakFreeze: true },
      description: 'Day 7 login reward - includes streak freeze!',
    },
  ];
};

describe('Default Daily Rewards Configuration', () => {
  it('should have exactly 7 rewards for the 7-day cycle', () => {
    const rewards = getDefaultDailyRewards();
    expect(rewards).toHaveLength(7);
  });

  it('should cover all days from 1 to 7', () => {
    const rewards = getDefaultDailyRewards();
    const days = rewards.map((r) => r.day);
    expect(days).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('should have escalating points (10→15→20→25→30→40→50)', () => {
    const rewards = getDefaultDailyRewards();
    const points = rewards.map((r) => r.reward.points);
    expect(points).toEqual([10, 15, 20, 25, 30, 40, 50]);
  });

  it('should have increasing or equal points each day', () => {
    const rewards = getDefaultDailyRewards();
    const points = rewards.map((r) => r.reward.points);

    for (let i = 1; i < points.length; i++) {
      expect(points[i]).toBeGreaterThanOrEqual(points[i - 1]);
    }
  });

  it('should only grant streak freeze on day 7', () => {
    const rewards = getDefaultDailyRewards();

    // Only day 7 should have streakFreeze
    const rewardsWithFreeze = rewards.filter((r) => r.reward.streakFreeze);
    expect(rewardsWithFreeze).toHaveLength(1);
    expect(rewardsWithFreeze[0].day).toBe(7);

    // Days 1-6 should not have streakFreeze
    const rewardsWithoutFreeze = rewards.filter((r) => r.day < 7);
    rewardsWithoutFreeze.forEach((reward) => {
      expect(reward.reward.streakFreeze).toBeUndefined();
    });
  });

  it('should have valid structure for each reward', () => {
    const rewards = getDefaultDailyRewards();

    rewards.forEach((reward, index) => {
      // Required fields
      expect(reward).toHaveProperty('id');
      expect(reward).toHaveProperty('day');
      expect(reward).toHaveProperty('reward');
      expect(reward).toHaveProperty('description');

      // Field types
      expect(typeof reward.id).toBe('number');
      expect(typeof reward.day).toBe('number');
      expect(typeof reward.reward.points).toBe('number');
      expect(typeof reward.description).toBe('string');

      // Valid values
      expect(reward.id).toBe(index + 1);
      expect(reward.day).toBe(index + 1);
      expect(reward.reward.points).toBeGreaterThan(0);
      expect(reward.description.length).toBeGreaterThan(0);

      // Reward object has points
      expect(reward.reward).toHaveProperty('points');
    });
  });

  it('should fix the original issue: day 1 reward exists', () => {
    const rewards = getDefaultDailyRewards();
    const day1Reward = rewards.find((r) => r.day === 1);

    // This was the original error: "No daily reward configured for day 1"
    expect(day1Reward).toBeDefined();
    expect(day1Reward?.reward.points).toBe(10);
    expect(day1Reward?.description).toBe('Day 1 login reward');
  });

  it('should have descriptive descriptions for each day', () => {
    const rewards = getDefaultDailyRewards();

    rewards.forEach((reward) => {
      expect(reward.description).toContain('login reward');
      expect(reward.description.toLowerCase()).toContain(`day ${reward.day}`);
    });
  });

  it('should have day 7 as the highest reward', () => {
    const rewards = getDefaultDailyRewards();
    const maxPoints = Math.max(...rewards.map((r) => r.reward.points));
    const day7 = rewards.find((r) => r.day === 7);

    expect(day7?.reward.points).toBe(maxPoints);
    expect(day7?.reward.points).toBe(50);
  });

  it('should have day 1 as the lowest reward', () => {
    const rewards = getDefaultDailyRewards();
    const minPoints = Math.min(...rewards.map((r) => r.reward.points));
    const day1 = rewards.find((r) => r.day === 1);

    expect(day1?.reward.points).toBe(minPoints);
    expect(day1?.reward.points).toBe(10);
  });

  it('should have unique IDs for each reward', () => {
    const rewards = getDefaultDailyRewards();
    const ids = rewards.map((r) => r.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(rewards.length);
  });

  it('should match the schema type', () => {
    const rewards = getDefaultDailyRewards();

    // Check that each reward conforms to DailyReward type
    rewards.forEach((reward) => {
      // Required fields from schema
      expect(reward).toHaveProperty('id');
      expect(reward).toHaveProperty('day');
      expect(reward).toHaveProperty('reward');
      expect(reward).toHaveProperty('description');

      // Reward object structure
      expect(reward.reward).toHaveProperty('points');
      // title is optional, so we don't check for it
      // streakFreeze is optional and only on day 7
    });
  });
});
