#!/usr/bin/env bun

/**
 * Context Analyzer - Analyzes Claude Code context usage and provides recommendations
 *
 * This plugin demonstrates:
 * - Using shared types from @claude-tools/shared
 * - Using shared utilities (CacheManager, SettingsUpdater)
 * - Reading Claude Code stdin data
 * - Providing actionable insights
 */

import type { ClaudeStdinData } from '@claude-tools/shared/types';
import { CacheManager } from '@claude-tools/shared/utils';

interface ContextAnalysis {
  status: 'healthy' | 'warning' | 'critical';
  percentage: number;
  recommendations: string[];
  metrics: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    contextWindowSize: number;
  };
}

class ContextAnalyzer {
  private cache: CacheManager;

  constructor() {
    this.cache = new CacheManager('/tmp/context-analyzer-cache');
  }

  async initialize() {
    await this.cache.initialize();
  }

  /**
   * Analyze context usage and provide recommendations
   */
  analyze(data: ClaudeStdinData): ContextAnalysis {
    const percentage = data.context_window?.used_percentage || 0;
    const inputTokens = data.context_window?.total_input_tokens || 0;
    const outputTokens = data.context_window?.total_output_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const contextWindowSize = data.context_window?.context_window_size || 200000;

    // Determine status
    let status: 'healthy' | 'warning' | 'critical';
    if (percentage < 70) {
      status = 'healthy';
    } else if (percentage < 90) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (percentage >= 90) {
      recommendations.push('🔴 CRITICAL: Context is almost full! Consider starting a new session.');
      recommendations.push('💡 Tip: Use /clear to reset context or /compress to optimize.');
    } else if (percentage >= 70) {
      recommendations.push('⚠️  WARNING: Context usage is high.');
      recommendations.push('💡 Tip: Consider summarizing earlier parts of the conversation.');
    } else if (percentage >= 50) {
      recommendations.push('ℹ️  Context usage is moderate. You have plenty of room.');
    } else {
      recommendations.push('✅ Context usage is healthy.');
    }

    // Additional recommendations based on token distribution
    const inputRatio = inputTokens / (totalTokens || 1);
    if (inputRatio > 0.7) {
      recommendations.push('📊 High input ratio. Consider being more concise in prompts.');
    }

    if (data.exceeds_200k_tokens) {
      recommendations.push('📈 Using extended context (> 200k). Monitor costs carefully.');
    }

    return {
      status,
      percentage: Math.round(percentage),
      recommendations,
      metrics: {
        inputTokens,
        outputTokens,
        totalTokens,
        contextWindowSize,
      },
    };
  }

  /**
   * Format analysis for display
   */
  formatAnalysis(analysis: ContextAnalysis): string {
    const lines: string[] = [];

    // Header
    lines.push('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📊 CONTEXT ANALYSIS REPORT');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Status
    const statusIcon = {
      healthy: '✅',
      warning: '⚠️ ',
      critical: '🔴',
    };

    lines.push(`Status: ${statusIcon[analysis.status]} ${analysis.status.toUpperCase()}`);
    lines.push(`Usage: ${analysis.percentage}% of ${analysis.metrics.contextWindowSize.toLocaleString()} tokens\n`);

    // Metrics
    lines.push('📈 Metrics:');
    lines.push(`   Input tokens:  ${analysis.metrics.inputTokens.toLocaleString()}`);
    lines.push(`   Output tokens: ${analysis.metrics.outputTokens.toLocaleString()}`);
    lines.push(`   Total tokens:  ${analysis.metrics.totalTokens.toLocaleString()}\n`);

    // Recommendations
    if (analysis.recommendations.length > 0) {
      lines.push('💡 Recommendations:');
      analysis.recommendations.forEach((rec) => {
        lines.push(`   ${rec}`);
      });
      lines.push('');
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return lines.join('\n');
  }
}

async function main() {
  try {
    // Read stdin
    const stdinText = await Bun.stdin.text();
    const data: ClaudeStdinData = JSON.parse(stdinText);

    // Initialize analyzer
    const analyzer = new ContextAnalyzer();
    await analyzer.initialize();

    // Analyze
    const analysis = analyzer.analyze(data);

    // Display
    console.log(analyzer.formatAnalysis(analysis));
  } catch (error) {
    console.error('❌ Error analyzing context:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { ContextAnalyzer };
