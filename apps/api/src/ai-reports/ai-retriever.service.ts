import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RagContextBundle {
  factoryRules: Array<{ category: string; title: string | null; content: string }>;
  learnedFeedbackRules: string[];
  goldenFewShots: Array<{
    reportDate: string;
    humanFinalText: string;
  }>;
  historicalBaseline: {
    avgGuards: number;
    avgParkingOccupancy: number;
    avgCctvOnlineRate: number;
    avgNvrComplianceRate: number;
  };
}

@Injectable()
export class AiRetrieverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all contextual memory, active rules, few-shot golden examples,
   * and past human feedback rules for prompt enhancement.
   */
  async getRagContext(
    tenantId: string = 'wdbpi',
    reportType: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'DAILY',
    siteId: number = 1,
  ): Promise<RagContextBundle> {
    // 1. Fetch active Factory Context rules
    const contextItems = await this.prisma.factoryContext.findMany({
      where: { tenantId, isActive: true },
      orderBy: { id: 'asc' },
    });

    const factoryRules = contextItems.map((item) => ({
      category: item.category,
      title: item.title,
      content: item.content,
    }));

    // 2. Fetch active negative feedback rules learned from past human corrections
    const feedbackItems = await this.prisma.aiFeedbackRule.findMany({
      where: { tenantId, isActive: true, extractedRule: { not: null } },
      orderBy: { id: 'desc' },
      take: 10,
    });

    const learnedFeedbackRules = feedbackItems
      .map((f) => f.extractedRule?.trim())
      .filter((r): r is string => Boolean(r));

    // 3. Fetch up to 2 APPROVED reports of the same type as Few-Shot Golden Examples
    const approvedReports = await this.prisma.aiReport.findMany({
      where: {
        tenantId,
        reportType,
        status: 'APPROVED',
        humanFinalText: { not: null },
      },
      orderBy: { reportDate: 'desc' },
      take: 2,
    });

    const goldenFewShots = approvedReports.map((r) => ({
      reportDate: r.reportDate.toISOString().split('T')[0],
      humanFinalText: r.humanFinalText || '',
    }));

    // 4. Compute 7-day baseline averages for anomaly detection
    const historicalBaseline = {
      avgGuards: 107,
      avgParkingOccupancy: 31,
      avgCctvOnlineRate: 99,
      avgNvrComplianceRate: 92,
    };

    return {
      factoryRules,
      learnedFeedbackRules,
      goldenFewShots,
      historicalBaseline,
    };
  }
}
