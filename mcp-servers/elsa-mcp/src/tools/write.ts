/**
 * Write 도구 — AI 분석 결과 저장, 포트폴리오 이슈 생성 등 쓰기 작업
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getClient } from "../client.js";

export function registerWriteTools(server: McpServer): void {
  // -----------------------------------------------------------------
  // elsa_submit_ai_analysis
  // -----------------------------------------------------------------
  server.tool(
    "elsa_submit_ai_analysis",
    "eLSA에 AI 분석 결과 저장. 스타트업에 대한 AI 분석(스크리닝, 포트폴리오 리뷰 등)을 DB에 기록한다.",
    {
      startup_id: z.string().uuid().describe("스타트업 UUID"),
      analysis_type: z
        .string()
        .describe(
          "분석 유형 (screening_analysis, portfolio_review, risk_assessment 등)",
        ),
      summary: z.string().min(1).describe("분석 요약 텍스트"),
      scores: z
        .record(z.unknown())
        .optional()
        .describe("세부 점수 (JSON 객체)"),
      risk_level: z
        .string()
        .optional()
        .describe("위험 수준 (low, medium, high, critical)"),
      recommendation: z.string().optional().describe("권고사항"),
      investment_attractiveness: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("투자 매력도 (1~10)"),
      report_path: z.string().optional().describe("보고서 파일 경로"),
    },
    async (params) => {
      try {
        const client = getClient();
        const result = await client.createAIAnalysis({
          startup_id: params.startup_id,
          analysis_type: params.analysis_type,
          summary: params.summary,
          scores: params.scores as Record<string, unknown> | undefined,
          risk_level: params.risk_level,
          recommendation: params.recommendation,
          investment_attractiveness: params.investment_attractiveness,
          report_path: params.report_path,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: [
                "AI 분석 결과가 저장되었습니다.",
                `- ID: ${result.id}`,
                `- 스타트업: ${result.startup_id}`,
                `- 유형: ${result.analysis_type}`,
                `- 요약: ${result.summary.slice(0, 100)}${result.summary.length > 100 ? "..." : ""}`,
                result.risk_level ? `- 위험 수준: ${result.risk_level}` : null,
                result.investment_attractiveness !== null
                  ? `- 투자 매력도: ${result.investment_attractiveness}/10`
                  : null,
                `- 생성일: ${result.created_at}`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `AI 분석 저장 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // -----------------------------------------------------------------
  // elsa_create_issue
  // -----------------------------------------------------------------
  server.tool(
    "elsa_create_issue",
    "eLSA 포트폴리오 이슈 생성. 리스크 모니터링 결과 발견된 문제를 DB에 기록한다.",
    {
      startup_id: z.string().uuid().describe("스타트업 UUID"),
      issue_type: z
        .string()
        .describe(
          "이슈 유형 (runway_risk, key_person_departure, customer_churn, dev_delay, legal_regulatory 등)",
        ),
      severity: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("심각도 (low, medium, high, critical). 기본: medium"),
      description: z.string().min(1).describe("이슈 상세 설명"),
      detected_by: z
        .string()
        .optional()
        .describe("감지 주체 (기본: ai-agent)"),
    },
    async (params) => {
      try {
        const client = getClient();
        const result = await client.createIssue({
          startup_id: params.startup_id,
          issue_type: params.issue_type,
          severity: params.severity ?? "medium",
          description: params.description,
          detected_by: params.detected_by ?? "ai-agent",
        });

        return {
          content: [
            {
              type: "text" as const,
              text: [
                "포트폴리오 이슈가 생성되었습니다.",
                `- ID: ${result.id}`,
                `- 스타트업: ${result.startup_id}`,
                `- 유형: ${result.issue_type}`,
                `- 심각도: ${result.severity}`,
                `- 설명: ${result.description}`,
                `- 감지: ${result.detected_by}`,
                `- 생성일: ${result.created_at}`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `이슈 생성 실패: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
