"use client";

import { useRouter } from "next/navigation";

export default function ComingSoonPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="text-6xl">🚧</div>
      <h1 className="text-2xl font-bold text-gray-800">준비 중입니다</h1>
      <p className="text-gray-500 text-center max-w-md">
        이 기능은 2차 배포에서 제공될 예정입니다.
        <br />
        현재는 소싱, 심사, 인계 기능을 이용해 주세요.
      </p>
      <button
        onClick={() => router.push("/dashboard")}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        대시보드로 이동
      </button>
    </div>
  );
}
