"use client";

export default function PageSkeletonLoader() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 w-full animate-pulse">
      {/* 1. HEADER SKELETON */}
      <header className="w-full border-b border-gray-200 bg-white">
        {/* Top Info Bar */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-2 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-3 w-28 bg-gray-200 rounded-none" />
            <div className="h-3 w-36 bg-gray-100 rounded-none hidden sm:block" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-3 w-20 bg-gray-200 rounded-none" />
            <div className="h-3 w-16 bg-gray-100 rounded-none" />
          </div>
        </div>

        {/* Main Logo & Search Bar */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-red-200 rounded-none" />
            <div className="h-7 w-48 bg-gray-200 rounded-none" />
          </div>
          <div className="hidden md:block flex-1 max-w-md">
            <div className="h-10 w-full bg-gray-100 border border-gray-200 rounded-none" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-24 bg-gray-100 border border-gray-200 rounded-none hidden sm:block" />
            <div className="h-9 w-28 bg-red-200 rounded-none" />
          </div>
        </div>

        {/* Navigation Categories Bar */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-2.5 flex items-center gap-6 border-t border-gray-100 overflow-hidden">
          {[80, 64, 72, 90, 68, 76, 60, 84, 70, 78].map((w, i) => (
            <div key={i} style={{ width: `${w}px` }} className="h-4 bg-gray-200 rounded-none shrink-0" />
          ))}
        </div>
      </header>

      {/* 2. HERO SECTION SKELETON */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 border-b border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Hero Story (Left ~67%) */}
          <div className="lg:col-span-8 flex flex-col md:flex-row gap-6 bg-white border border-gray-200 p-4 min-h-[360px]">
            <div className="w-full md:w-3/5 aspect-[16/10] bg-gray-200 rounded-none shrink-0" />
            <div className="w-full md:w-2/5 flex flex-col justify-between py-1">
              <div className="space-y-3">
                <div className="h-3 w-20 bg-red-200 rounded-none" />
                <div className="h-6 w-full bg-gray-200 rounded-none" />
                <div className="h-6 w-4/5 bg-gray-200 rounded-none" />
                <div className="h-3.5 w-full bg-gray-100 rounded-none mt-2" />
                <div className="h-3.5 w-11/12 bg-gray-100 rounded-none" />
                <div className="h-3.5 w-3/4 bg-gray-100 rounded-none" />
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-28 bg-gray-200 rounded-none" />
                  <div className="h-2.5 w-20 bg-gray-100 rounded-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Trending Now Box (Right ~33%) */}
          <div className="lg:col-span-4 bg-white border border-gray-200 p-4 flex flex-col justify-between min-h-[360px]">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-3">
              <div className="w-1.5 h-4 bg-red-300 rounded-none" />
              <div className="h-4 w-28 bg-gray-200 rounded-none" />
            </div>
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-1">
                  <div className="w-16 h-12 bg-gray-200 rounded-none shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-2.5 w-16 bg-red-200 rounded-none" />
                    <div className="h-3.5 w-full bg-gray-200 rounded-none" />
                    <div className="h-3.5 w-4/5 bg-gray-100 rounded-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. EDITOR'S PICKS SKELETON */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-5 bg-red-300 rounded-none" />
          <div className="h-5 w-36 bg-gray-200 rounded-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[16/10] w-full bg-gray-200 rounded-none" />
              <div className="h-2.5 w-20 bg-red-200 rounded-none" />
              <div className="h-4 w-full bg-gray-200 rounded-none" />
              <div className="h-4 w-3/4 bg-gray-200 rounded-none" />
              <div className="h-3 w-24 bg-gray-100 rounded-none pt-1" />
            </div>
          ))}
        </div>
      </section>

      {/* 4. LATEST NEWS SKELETON */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-6 bg-red-300 rounded-none" />
          <div className="h-6 w-32 bg-gray-200 rounded-none" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Featured (Left) */}
          <div className="lg:col-span-6 flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2 aspect-[4/3] bg-gray-200 rounded-none shrink-0" />
            <div className="w-full md:w-1/2 space-y-3">
              <div className="h-3 w-20 bg-red-200 rounded-none" />
              <div className="h-5 w-full bg-gray-200 rounded-none" />
              <div className="h-5 w-4/5 bg-gray-200 rounded-none" />
              <div className="h-3.5 w-full bg-gray-100 rounded-none" />
              <div className="h-3.5 w-3/4 bg-gray-100 rounded-none" />
              <div className="h-3 w-32 bg-gray-200 rounded-none pt-2" />
            </div>
          </div>

          {/* Stacked 3 items (Middle) */}
          <div className="lg:col-span-3 space-y-4 lg:border-l border-gray-100 lg:pl-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-20 h-16 bg-gray-200 rounded-none shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-2.5 w-14 bg-red-200 rounded-none" />
                  <div className="h-3.5 w-full bg-gray-200 rounded-none" />
                  <div className="h-3.5 w-3/4 bg-gray-100 rounded-none" />
                </div>
              </div>
            ))}
          </div>

          {/* Newsletter Box (Right) */}
          <div className="lg:col-span-3 bg-gray-50 border border-gray-200 p-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-5 w-28 bg-gray-200 rounded-none" />
              <div className="h-3.5 w-full bg-gray-100 rounded-none" />
              <div className="h-3.5 w-4/5 bg-gray-100 rounded-none" />
            </div>
            <div className="space-y-2 mt-4">
              <div className="h-9 w-full bg-white border border-gray-200 rounded-none" />
              <div className="h-9 w-full bg-red-300 rounded-none" />
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOTTOM CATEGORIES SKELETON */}
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <div className="w-1.5 h-4 bg-red-300 rounded-none" />
                <div className="h-4 w-24 bg-gray-200 rounded-none" />
              </div>
              <div className="aspect-[16/10] w-full bg-gray-200 rounded-none" />
              <div className="h-4 w-full bg-gray-200 rounded-none" />
              <div className="h-3 w-3/4 bg-gray-100 rounded-none" />
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="h-3 w-full bg-gray-100 rounded-none" />
                <div className="h-3 w-4/5 bg-gray-100 rounded-none" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
