import Link from 'next/link';

const authorsList = [
  { name: "Rushdhi MR", image: "https://f005.backblazeb2.com/file/LondonNetwork/avatars/author_bluesuit.jpg" },
  { name: "Muba_kity", image: "https://f005.backblazeb2.com/file/LondonNetwork/avatars/author_woman.jpg" },
  { name: "Roomi", image: "https://f005.backblazeb2.com/file/LondonNetwork/avatars/author_glasses.jpg" },
  { name: "Ruzni", image: "https://f005.backblazeb2.com/file/LondonNetwork/avatars/author_beard.jpg" }
];

export default function PeopleBehindStories() {
  return (
    <section className="bg-[#EEEEEE] py-12 md:py-16 font-standard-sans">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Text Content & CTA Button */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
            <div>
              <h2 className="text-[32px] md:text-[38px] font-bold text-black leading-tight mb-6 font-standard-sans">
                People behind the stories
              </h2>
              <div className="space-y-4 text-[14px] text-zinc-800 leading-relaxed font-standard-sans">
                <p>
                  Our publishing model brings journalists and subject matter experts together, combining reported stories with first-hand expertise in a way that gives London BigBen a vantage point most publications don’t have.
                </p>
                <p>
                  When the work of innovators and leaders is translated, shared, and connected across those gaps, organizations make better decisions, boards ask better questions, and Canada’s innovation economy builds with more purpose.
                </p>
                <p>
                  That’s the shared value we exist to create.
                </p>
              </div>
            </div>
            
            <div className="pt-4">
              <button className="bg-[#BF1E2D] hover:bg-red-800 text-white font-bold text-[14px] px-6 py-2.5 border border-black cursor-pointer rounded-none transition-colors">
                Learn more &nbsp;&rarr;
              </button>
            </div>
          </div>

          {/* Right Column: 4x2 Grid of Authors */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6">
              {authorsList.map((author, index) => {
                const slug = author.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <Link key={index} href={`/author/${slug}`} className="flex flex-col group cursor-pointer">
                    <div className="w-full aspect-square overflow-hidden bg-gray-200 rounded-none">
                      <img
                        src={author.image}
                        alt={author.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <div className="w-[5px] h-[14px] bg-[#BF1E2D] flex-shrink-0" />
                      <span className="text-[13px] font-bold text-black underline underline-offset-2 group-hover:text-[#BF1E2D] transition-colors leading-tight">
                        {author.name}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
