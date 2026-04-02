'use client';

interface StatusBannersProps {
  error: string;
  notice: string;
}

export function StatusBanners({ error, notice }: StatusBannersProps) {
  return (
    <>
      {error ? (
        <div className="px-5 pb-3 md:px-12">
          <div className="mx-auto max-w-[920px] rounded-xl border border-[#623535] bg-[#2b1214] px-4 py-3 text-[12px] text-[#f1a2a2]">
            {error}
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="px-5 pb-3 md:px-12">
          <div className="mx-auto max-w-[920px] rounded-xl border border-[#2e6f5e] bg-[#112520] px-4 py-3 text-[12px] text-[#a6dfcf]">
            {notice}
          </div>
        </div>
      ) : null}
    </>
  );
}
