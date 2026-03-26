import ComingSoon from "@/components/ui/ComingSoon";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ComingSoon title="준비 중입니다" description="이 기능은 2차 배포에서 제공될 예정입니다." />;
}
