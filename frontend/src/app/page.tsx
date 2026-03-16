/**
 * 전사 대시보드 — 메인 페이지
 * Phase 1: 스켈레톤 UI, 추후 KPI 카드 + 차트 채움
 */
export default function Home() {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a365d", marginBottom: 16 }}>
        전사 대시보드
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard title="파이프라인 딜 수" value="-" unit="건" color="#3182ce" />
        <KpiCard title="이번 달 신규 소싱" value="-" unit="건" color="#38a169" />
        <KpiCard title="포트폴리오 기업" value="-" unit="사" color="#d69e2e" />
        <KpiCard title="진행 중 PoC" value="-" unit="건" color="#e53e3e" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
        <DashSection title="딜플로우 현황">
          <p style={{ color: "#718096", fontSize: 13 }}>파이프라인 단계별 현황이 표시됩니다.</p>
        </DashSection>
        <DashSection title="긴급 알림">
          <p style={{ color: "#718096", fontSize: 13 }}>미확인 인계, 계약 기한 초과 등 긴급 알림이 표시됩니다.</p>
        </DashSection>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        <DashSection title="팀별 KPI 요약">
          <p style={{ color: "#718096", fontSize: 13 }}>5개 팀 핵심 KPI 달성률이 표시됩니다.</p>
        </DashSection>
        <DashSection title="최근 활동">
          <p style={{ color: "#718096", fontSize: 13 }}>최근 변경사항과 활동 로그가 표시됩니다.</p>
        </DashSection>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  unit,
  color,
}: {
  title: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 8,
        padding: "16px 20px",
        borderTop: `3px solid ${color}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontSize: 12, color: "#718096", marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color }}>{value}</span>
        <span style={{ fontSize: 13, color: "#a0aec0" }}>{unit}</span>
      </div>
    </div>
  );
}

function DashSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 8,
        padding: "16px 20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        minHeight: 140,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#2d3748",
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
