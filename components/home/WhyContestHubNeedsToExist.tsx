import React, { useEffect, useRef, useState } from 'react';
import OptimizedImage from '../OptimizedImage';
import { cn } from '../ui/Common';
import { useI18n } from '../../contexts/I18nContext';

type StoryTone = {
  badge: string;
  bulletDot: string;
  divider: string;
  imageBorder: string;
  imageGlow: string;
  promise: string;
  surfaceTint: string;
};

export interface ContestHubStory {
  id: string;
  badge: string;
  label: string;
  titleLines: [string, string];
  description: string;
  bullets: [string, string, string];
  closing: string;
  image: string;
  imageAlt: string;
  imageCaption: string;
  tone: StoryTone;
}

// Swap these classes to re-theme the section without touching layout or content.
export const contestHubStoryTheme = {
  sectionGlow: 'from-primary-100/70 via-transparent to-emerald-100/70 dark:from-primary-900/30 dark:to-emerald-900/30',
  sectionBadge: 'border-primary-100 bg-white/90 text-primary-700 dark:border-primary-800 dark:bg-slate-900/90 dark:text-primary-300',
  sectionTitle: 'from-slate-900 via-slate-800 to-primary-700 dark:from-slate-100 dark:via-slate-200 dark:to-primary-300',
};

const storyTonePresets: Record<'gold' | 'teal' | 'mint', StoryTone> = {
  gold: {
    badge: 'border-amber-200/70 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    bulletDot: 'bg-amber-400',
    divider: 'border-amber-100/80 dark:border-amber-800/50',
    imageBorder: 'border-amber-100/80 dark:border-amber-800/50',
    imageGlow: 'from-amber-200/60 via-amber-100/10 to-primary-100/50 dark:from-amber-800/30 dark:via-amber-900/10 dark:to-primary-900/30',
    promise: 'text-amber-900 dark:text-amber-200',
    surfaceTint: 'from-amber-50/60 via-white to-white dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900',
  },
  teal: {
    badge: 'border-primary-100 bg-primary-50 text-primary-800 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-200',
    bulletDot: 'bg-primary-500',
    divider: 'border-primary-100/80 dark:border-primary-800/50',
    imageBorder: 'border-primary-100/80 dark:border-primary-800/50',
    imageGlow: 'from-primary-200/60 via-primary-100/10 to-emerald-100/55 dark:from-primary-800/30 dark:via-primary-900/10 dark:to-emerald-900/30',
    promise: 'text-primary-800 dark:text-primary-200',
    surfaceTint: 'from-primary-50/55 via-white to-white dark:from-primary-950/25 dark:via-slate-900 dark:to-slate-900',
  },
  mint: {
    badge: 'border-emerald-100 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
    bulletDot: 'bg-emerald-400',
    divider: 'border-emerald-100/80 dark:border-emerald-800/50',
    imageBorder: 'border-emerald-100/80 dark:border-emerald-800/50',
    imageGlow: 'from-emerald-200/60 via-white to-primary-100/50 dark:from-emerald-800/30 dark:via-slate-900 dark:to-primary-900/30',
    promise: 'text-emerald-900 dark:text-emerald-200',
    surfaceTint: 'from-emerald-50/60 via-white to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900',
  },
};

const contestHubStoriesEn: ContestHubStory[] = [
  {
    id: 'discovery-gap',
    badge: 'Story 01',
    label: 'Finding the right first step',
    titleLines: [
      'Talented students still struggle',
      'to find the right place to begin.',
    ],
    description:
      'Across Vietnam, many students are capable of far more than they can easily access. The problem is not a lack of ambition. It is the friction of discovering which competitions fit their strengths, their stage, and their schedule when information is scattered across too many unofficial places.',
    bullets: [
      'Competition opportunities are fragmented across school chats, social posts, and word of mouth.',
      'Students rarely get enough context to judge fit, level, or timing with confidence.',
      'A crowded calendar makes it easy to feel overwhelmed before the journey even begins.',
    ],
    closing:
      'ContestHub aims to become a clearer starting point where opportunity feels organized, credible, and easier to choose.',
    image:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
    imageAlt:
      'A student reviewing notes and searching for the right direction at a desk.',
    imageCaption: 'Searching for direction should not feel this fragmented.',
    tone: storyTonePresets.gold,
  },
  {
    id: 'community-gap',
    badge: 'Story 02',
    label: 'Building with the right people',
    titleLines: [
      'A strong idea can still stall',
      'when no one serious builds alongside it.',
    ],
    description:
      'Many students want to start a project, join a team, or test an idea in the real world. What often slows them down is not motivation, but the absence of a trusted environment to meet collaborators, mentors, and peers who care with the same level of intent.',
    bullets: [
      'Teammate matching still happens through scattered, informal channels.',
      'Commitment and skill fit are hard to evaluate before working together.',
      'Mentorship and community support rarely live in one dependable place.',
    ],
    closing:
      'ContestHub promises a more serious space to meet teammates, connect with mentors, and grow inside a community that shows up.',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    imageAlt:
      'A group of students collaborating around a table with laptops and notebooks.',
    imageCaption: 'Good collaboration begins with trust, alignment, and shared effort.',
    tone: storyTonePresets.teal,
  },
  {
    id: 'portfolio-gap',
    badge: 'Story 03',
    label: 'Turning effort into a visible journey',
    titleLines: [
      'Students work hard, yet their progress',
      'still ends up living in scattered pieces.',
    ],
    description:
      'Competitions, projects, presentations, certificates, and personal milestones often sit across folders, slides, links, and inboxes. The effort is real, but the story is hard to see. Without a coherent record, students lose the chance to turn steady work into a portfolio that reflects who they are becoming.',
    bullets: [
      'Achievements are spread across too many tools and disconnected records.',
      'Growth becomes difficult to explain over time without a clear narrative.',
      'Long-term development feels uncertain when there is no shared place to track it.',
    ],
    closing:
      'ContestHub is being built to help students shape a clearer portfolio, a stronger rhythm of growth, and a journey worth carrying forward.',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    imageAlt:
      'A student refining a presentation and organizing project work on a laptop.',
    imageCaption: 'Progress becomes more powerful when it can be seen as one story.',
    tone: storyTonePresets.mint,
  },
];

const contestHubStoriesVi: ContestHubStory[] = [
  {
    id: 'discovery-gap',
    badge: 'Câu chuyện 01',
    label: 'Tìm điểm bắt đầu phù hợp',
    titleLines: [
      'Nhiều học sinh giỏi vẫn loay hoay',
      'không biết nên bắt đầu từ đâu.',
    ],
    description:
      'Tại Việt Nam, rất nhiều học sinh có năng lực nhưng không dễ tiếp cận đúng cơ hội cho mình. Vấn đề không nằm ở sự thiếu cố gắng, mà ở việc thông tin về các cuộc thi đang bị phân tán, khiến các em khó xác định đâu là lựa chọn phù hợp với thế mạnh, giai đoạn phát triển và lịch học của mình.',
    bullets: [
      'Thông tin cuộc thi bị phân tán qua group lớp, mạng xã hội và truyền miệng.',
      'Học sinh thiếu bối cảnh để đánh giá độ phù hợp, cấp độ và thời điểm đăng ký.',
      'Quá nhiều lịch thi chồng chéo dễ dàng biến cảm hứng thành sự quá tải.',
    ],
    closing:
      'ContestHub hướng tới việc trở thành nơi bắt đầu rõ ràng hơn, nơi cơ hội được sắp xếp mạch lạc và dễ lựa chọn hơn.',
    image:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
    imageAlt:
      'Học sinh đang xem ghi chú và tìm hướng đi phù hợp tại bàn học.',
    imageCaption: 'Việc tìm hướng đi không nên bắt đầu từ sự rời rạc.',
    tone: storyTonePresets.gold,
  },
  {
    id: 'community-gap',
    badge: 'Câu chuyện 02',
    label: 'Đồng hành cùng đúng người',
    titleLines: [
      'Nhiều ý tưởng tốt vẫn dừng lại',
      'khi không tìm được người cùng đi tiếp.',
    ],
    description:
      'Nhiều học sinh muốn làm dự án, lập đội thi hoặc biến ý tưởng thành sản phẩm thật. Điều thường cản trở các em không phải là thiếu động lực, mà là thiếu một môi trường đáng tin cậy để tìm đồng đội, mentor và những người có cùng mức độ nghiêm túc.',
    bullets: [
      'Việc tìm đồng đội vẫn chủ yếu dựa vào các kênh không chính thức và rời rạc.',
      'Rất khó đánh giá sự phù hợp về kỹ năng và mức độ cam kết trước khi bắt đầu.',
      'Mentor và cộng đồng hỗ trợ hiếm khi được kết nối trong cùng một nơi ổn định.',
    ],
    closing:
      'ContestHub hứa hẹn tạo ra một không gian nghiêm túc hơn để kết nối đồng đội, mentor và những người thật sự muốn xây dựng cùng nhau.',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    imageAlt:
      'Nhóm học sinh đang thảo luận và làm việc cùng nhau quanh bàn học.',
    imageCaption: 'Cộng tác tốt bắt đầu từ sự tin tưởng và sự đồng lòng.',
    tone: storyTonePresets.teal,
  },
  {
    id: 'portfolio-gap',
    badge: 'Câu chuyện 03',
    label: 'Biến nỗ lực thành một hành trình rõ ràng',
    titleLines: [
      'Học sinh nỗ lực rất nhiều, nhưng thành quả',
      'vẫn để lại ở những mảnh rời rạc.',
    ],
    description:
      'Cuộc thi, dự án, bài thuyết trình, chứng chỉ và các cột mốc cá nhân thường nằm ở nhiều folder, link và công cụ khác nhau. Nỗ lực là có thật, nhưng câu chuyện phát triển lại khó nhìn thấy. Khi thiếu một nơi lưu giữ mạch lạc, học sinh sẽ khó biến hành trình đó thành portfolio có giá trị và bền vững.',
    bullets: [
      'Thành tích nằm rải rác trên quá nhiều công cụ và hồ sơ tách rời nhau.',
      'Sự trưởng thành khó được kể lại một cách thuyết phục theo thời gian.',
      'Lộ trình dài hạn trở nên mờ nhạt khi không có nơi cùng nhau lưu giữ và theo dõi.',
    ],
    closing:
      'ContestHub đang được xây dựng để giúp học sinh gom lại hành trình của mình thành một portfolio rõ ràng, bền vững và có định hướng lâu dài.',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    imageAlt:
      'Học sinh đang hoàn thiện bài thuyết trình và sắp xếp tài liệu dự án trên laptop.',
    imageCaption: 'Nỗ lực sẽ có giá trị hơn khi được nhìn thấy như một câu chuyện liền mạch.',
    tone: storyTonePresets.mint,
  },
];

const getRevealStyle = (
  revealed: boolean,
  reduceMotion: boolean,
  delay = 0,
  offset = 34,
): React.CSSProperties => {
  if (reduceMotion) {
    return {};
  }

  return {
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translateY(0)' : `translateY(${offset}px)`,
    transitionProperty: 'opacity, transform',
    transitionDuration: '780ms',
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    transitionDelay: `${delay}ms`,
  };
};

const WhyContestHubNeedsToExist: React.FC = () => {
  const { locale } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const isEnglish = locale === 'en';
  const contestHubStories = isEnglish ? contestHubStoriesEn : contestHubStoriesVi;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReduceMotion(mediaQuery.matches);

    updatePreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    mediaQuery.addListener(updatePreference);
    return () => mediaQuery.removeListener(updatePreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setRevealed(true);
      return;
    }

    const section = sectionRef.current;
    if (!section) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <section ref={sectionRef} className="relative mt-20 mb-10">
      <div
        className={cn(
          'pointer-events-none absolute inset-x-10 top-8 h-40 rounded-full bg-linear-to-r opacity-70 blur-3xl [mask-image:linear-gradient(to_bottom,black,transparent)] [mask-repeat:no-repeat] [mask-size:100%_100%] md:inset-x-20 md:top-10 lg:inset-x-32 lg:h-52',
          contestHubStoryTheme.sectionGlow,
        )}
      />
      <div className="pointer-events-none absolute left-8 top-24 h-40 w-40 rounded-full bg-primary-100/60 dark:bg-primary-900/30 blur-3xl md:left-20" />
      <div className="pointer-events-none absolute right-4 top-1/3 h-44 w-44 rounded-full bg-amber-100/60 dark:bg-amber-900/30 blur-3xl md:right-16" />

      <div className="text-center" style={getRevealStyle(revealed, reduceMotion)}>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm backdrop-blur',
            contestHubStoryTheme.sectionBadge,
          )}
        >
          {isEnglish ? 'Why ContestHub Needs to Exist' : 'Vì sao ContestHub cần tồn tại'}
        </span>
        <h2
          className={cn(
            'mt-5 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl',
            'bg-linear-to-r bg-clip-text text-transparent',
            contestHubStoryTheme.sectionTitle,
          )}
        >
          {isEnglish ? 'The real stories behind every competition.' : 'Những câu chuyện phía sau mỗi cuộc thi.'}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-400 md:text-lg">
          {isEnglish
            ? 'Across Vietnam, ambitious students still navigate competitions through scattered information, informal networks, and achievements that live in too many places. ContestHub is being built to make that journey clearer, more connected, and more meaningful over time.'
            : 'Trên khắp Việt Nam, nhiều học sinh vẫn phải tìm đường đến các cuộc thi qua thông tin rời rạc, các mối quan hệ không chính thức và những thành quả bị cắt nhỏ ở quá nhiều nơi. ContestHub được xây dựng để làm cho hành trình đó rõ ràng hơn, liên kết hơn và có ý nghĩa hơn theo thời gian.'}
        </p>
      </div>

      <div className="mt-14 space-y-8 md:space-y-10 lg:space-y-12">
        {contestHubStories.map((story, index) => {
          const reverseOnDesktop = index === 1;

          return (
            <article
              key={story.id}
              className="group relative overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/90 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.2)] ring-1 ring-white/70 dark:ring-slate-800/70 backdrop-blur-sm transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_28px_90px_-36px_rgba(15,23,42,0.24)]"
              style={getRevealStyle(revealed, reduceMotion, 140 + index * 120)}
            >
              <div className={cn('absolute inset-0 bg-linear-to-br opacity-80', story.tone.surfaceTint)} />
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-200/90 dark:via-slate-700/90 to-transparent" />

              <div className="relative grid gap-8 px-6 py-6 md:gap-10 md:px-8 md:py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-10">
                <div className={cn('order-1 flex flex-col justify-center', reverseOnDesktop ? 'lg:order-2' : 'lg:order-1')}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]', story.tone.badge)}>
                      {story.badge}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {story.label}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100 md:text-[2rem]">
                    <span className="block">{story.titleLines[0]}</span>
                    <span className="block text-slate-700 dark:text-slate-300">{story.titleLines[1]}</span>
                  </h3>

                  <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-400">
                    {story.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {story.bullets.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm leading-7 text-slate-600 dark:text-slate-400 md:text-[0.95rem]">
                        <span className={cn('mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full', story.tone.bulletDot)} />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className={cn('mt-6 border-t pt-5', story.tone.divider)}>
                    <p className={cn('text-sm font-semibold leading-7 md:text-base', story.tone.promise)}>
                      {story.closing}
                    </p>
                  </div>
                </div>

                <div className={cn('order-2 flex items-center', reverseOnDesktop ? 'lg:order-1' : 'lg:order-2')}>
                  <div className="relative w-full">
                    <div className={cn('pointer-events-none absolute inset-4 rounded-[2rem] bg-linear-to-br opacity-90 blur-2xl transition-opacity duration-500 group-hover:opacity-100', story.tone.imageGlow)} />
                    <div className={cn('relative overflow-hidden rounded-[1.75rem] border bg-slate-100 dark:bg-slate-800 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.35)]', story.tone.imageBorder)}>
                      <OptimizedImage
                        src={story.image}
                        alt={story.imageAlt}
                        className="min-h-[280px] rounded-[1.75rem] transition-transform duration-700 group-hover:scale-[1.02] md:min-h-[340px]"
                        aspectRatio="portrait"
                        lazy={true}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/18 via-transparent to-white/15" />
                      <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/50 dark:border-slate-700/50 bg-white/78 dark:bg-slate-900/78 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur">
                        <p className="text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
                          {story.imageCaption}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default WhyContestHubNeedsToExist;
