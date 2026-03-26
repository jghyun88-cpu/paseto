"use client";

import { useRouter } from "next/navigation";

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export default function ComingSoon({
  title = "준비 중입니다",
  description = "이 기능은 현재 개발 중이며, 곧 사용하실 수 있습니다.",
}: ComingSoonProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 text-6xl">🚧</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-500 mb-8">{description}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          대시보드로 돌아가기
        </button>
      </div>
    </div>
  );
}
