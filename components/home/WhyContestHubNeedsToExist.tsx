import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
  accentLine: string;
  numberColor: string;
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
  sectionGlow: 'from-primary-100/70 via-transparent to-emerald-100/70',
  sectionBadge: 'border-primary-100 bg-white/90 text-primary-700',
  sectionTitle: 'from-slate-900 via-slate-800 to-primary-700',
};

const storyTonePresets: Record<'gold' | 'teal' | 'mint', StoryTone> = {
  gold: {
    badge: 'border-amber-200/70 bg-amber-50 text-amber-900',
    bulletDot: 'bg-amber-400',
    divider: 'border-amber-100/80',
    imageBorder: 'border-amber-100/80',
    imageGlow: 'from-amber-200/60 via-amber-100/10 to-primary-100/50',
    promise: 'text-amber-900',
    surfaceTint: 'from-amber-50/60 via-white to-white',
    accentLine: 'from-amber-400 to-amber-200',
    numberColor: 'text-amber-200/30',
  },
  teal: {
    badge: 'border-primary-100 bg-primary-50 text-primary-800',
    bulletDot: 'bg-primary-500',
    divider: 'border-primary-100/80',
    imageBorder: 'border-primary-100/80',
    imageGlow: 'from-primary-200/60 via-primary-100/10 to-emerald-100/55',
    promise: 'text-primary-800',
    surfaceTint: 'from-primary-50/55 via-white to-white',
    accentLine: 'from-primary-500 to-primary-200',
    numberColor: 'text-primary-200/30',
  },
  mint: {
    badge: 'border-emerald-100 bg-emerald-50 text-emerald-900',
    bulletDot: 'bg-emerald-400',
    divider: 'border-emerald-100/80',
    imageBorder: 'border-emerald-100/80',
    imageGlow: 'from-emerald-200/60 via-white to-primary-100/50',
    promise: 'text-emerald-900',
    surfaceTint: 'from-emerald-50/60 via-white to-white',
    accentLine: 'from-emerald-400 to-emerald-200',
    numberColor: 'text-emerald-200/30',
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
      'Blanc aims to become a clearer starting point where opportunity feels organized, credible, and easier to choose.',
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
      'Blanc promises a more serious space to meet teammates, connect with mentors, and grow inside a community that shows up.',
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
      'Blanc is being built to help students shape a clearer portfolio, a stronger rhythm of growth, and a journey worth carrying forward.',
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
      'Nhiều học sinh giỏi',
      'vẫn chưa biết bắt đầu từ đâu.',
    ],
    description:
      'Cơ hội có nhiều, nhưng thông tin còn rời rạc. Khi thiếu một nơi tổng hợp rõ ràng, việc chọn đúng cuộc thi trở nên khó hơn cần thiết.',
    bullets: [
      'Thông tin còn rải rác.',
      'Khó chọn đúng cuộc thi.',
      'Lịch chồng chéo dễ gây quá tải.',
    ],
    closing:
      'ContestHub hướng tới một điểm bắt đầu rõ ràng hơn.',
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
      'Nhiều ý tưởng tốt',
      'dừng lại vì thiếu người đồng hành.',
    ],
    description:
      'Không ít học sinh có động lực, nhưng thiếu một môi trường đáng tin cậy để tìm đồng đội và mentor phù hợp.',
    bullets: [
      'Thiếu nơi tìm đồng đội.',
      'Khó gặp mentor phù hợp.',
      'Cộng đồng chưa đủ kết nối.',
    ],
    closing:
      'ContestHub muốn kết nối những người có thể đi xa cùng nhau.',
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
    label: 'Biến nỗ lực thành hành trình rõ ràng',
    titleLines: [
      'Nỗ lực có thật,',
      'nhưng thành quả thường bị phân tán.',
    ],
    description:
      'Khi các cột mốc nằm ở nhiều nơi khác nhau, học sinh khó kể lại hành trình của mình một cách thuyết phục.',
    bullets: [
      'Cột mốc nằm ở nhiều nơi.',
      'Khó kể lại hành trình.',
      'Portfolio khó đủ thuyết phục.',
    ],
    closing:
      'ContestHub giúp biến nỗ lực thành một hành trình rõ ràng hơn.',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    imageAlt:
      'Học sinh đang hoàn thiện bài thuyết trình và sắp xếp tài liệu dự án trên laptop.',
    imageCaption: 'Nỗ lực sẽ có giá trị hơn khi được nhìn thấy như một câu chuyện liền mạch.',
    tone: storyTonePresets.mint,
  },
];

/* ─── Framer Motion Variants ─── */
const fadeUp = {
  hidden: { y: 48, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' } },
};

const slideFromLeft = {
  hidden: { x: -60, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const slideFromRight = {
  hidden: { x: 60, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const scaleReveal = {
  hidden: { scale: 0.92, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const staggerChild = {
  hidden: { y: 24, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const bulletReveal = {
  hidden: { x: -16, opacity: 0 },
  visible: (i: number) => ({
    x: 0,
    opacity: 1,
    transition: { duration: 0.45, delay: 0.35 + i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const lineGrow = {
  hidden: { scaleY: 0 },
  visible: {
    scaleY: 1,
    transition: { duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
};

const VIEWPORT_OPTS = { once: true, margin: '-80px' } as const;

/* ─── StoryCard Component ─── */
const StoryCard: React.FC<{
  story: ContestHubStory;
  index: number;
}> = ({ story, index }) => {
  const reverseOnDesktop = index === 1;
  const storyNumber = String(index + 1).padStart(2, '0');

  const contentVariant = reverseOnDesktop ? slideFromRight : slideFromLeft;
  const imageVariant = reverseOnDesktop ? slideFromLeft : slideFromRight;

  return (
    <motion.article
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_OPTS}
      variants={fadeIn}
      className="group relative"
    >
      {/* Decorative vertical accent line */}
      <motion.div
        variants={lineGrow}
        className={cn(
          'absolute left-1/2 -top-6 h-12 w-px origin-top -translate-x-1/2 bg-linear-to-b md:-top-8 md:h-16',
          story.tone.accentLine,
        )}
        style={{ display: index === 0 ? 'none' : 'block' }}
      />

      <div className="relative overflow-hidden rounded-4xl border border-slate-200/80 bg-white/95 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.18)] ring-1 ring-white/70 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_32px_100px_-36px_rgba(15,23,42,0.22)]">
        <div className={cn('absolute inset-0 bg-linear-to-br opacity-80', story.tone.surfaceTint)} />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-200/90 to-transparent" />

        {/* Giant ghost number */}
        <div className={cn('pointer-events-none absolute -right-4 -top-8 select-none text-[10rem] font-black leading-none tracking-tighter md:-right-2 md:-top-6 md:text-[14rem]', story.tone.numberColor)}>
          {storyNumber}
        </div>

        <div className="relative grid gap-0 lg:grid-cols-2">
          {/* ─── Text Content ─── */}
          <motion.div
            variants={contentVariant}
            className={cn(
              'flex flex-col justify-center px-8 py-10 md:px-12 md:py-14 lg:px-14',
              reverseOnDesktop ? 'lg:order-2' : 'lg:order-1',
            )}
          >
            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={VIEWPORT_OPTS}>
              {/* Badge row */}
              <motion.div variants={staggerChild} className="flex flex-wrap items-center gap-3">
                <span className={cn('inline-flex rounded-full border px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em]', story.tone.badge)}>
                  {story.badge}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {story.label}
                </span>
              </motion.div>

              {/* Title */}
              <motion.h3 variants={staggerChild} className="mt-6 text-[1.65rem] font-black leading-[1.2] tracking-tight text-slate-900 md:text-[2.1rem]">
                <span className="block">{story.titleLines[0]}</span>
                <span className="block text-slate-600">{story.titleLines[1]}</span>
              </motion.h3>

              {/* Description */}
              <motion.p variants={staggerChild} className="mt-5 max-w-xl text-[0.95rem] leading-[1.85] text-slate-500">
                {story.description}
              </motion.p>

              {/* Bullet points */}
              <div className="mt-7 space-y-3.5">
                {story.bullets.map((point, i) => (
                  <motion.div
                    key={point}
                    custom={i}
                    variants={bulletReveal}
                    initial="hidden"
                    whileInView="visible"
                    viewport={VIEWPORT_OPTS}
                    className="flex items-start gap-3.5 text-[0.9rem] leading-7 text-slate-600"
                  >
                    <span className={cn('mt-2 h-2 w-2 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-white', story.tone.bulletDot, story.tone.bulletDot.replace('bg-', 'ring-'))} />
                    <span>{point}</span>
                  </motion.div>
                ))}
              </div>

              {/* Closing promise */}
              <motion.div variants={staggerChild} className={cn('mt-8 border-t pt-6', story.tone.divider)}>
                <p className={cn('text-sm font-semibold leading-7 italic md:text-base', story.tone.promise)}>
                  {story.closing}
                </p>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* ─── Image ─── */}
          <motion.div
            variants={imageVariant}
            className={cn(
              'relative flex items-center p-5 md:p-8',
              reverseOnDesktop ? 'lg:order-1' : 'lg:order-2',
            )}
          >
            <motion.div variants={scaleReveal} className="relative w-full">
              <div className={cn('pointer-events-none absolute inset-4 rounded-4xl bg-linear-to-br opacity-80 blur-2xl transition-opacity duration-700 group-hover:opacity-100', story.tone.imageGlow)} />
              <div className={cn('relative overflow-hidden rounded-[1.75rem] border bg-slate-100 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.35)]', story.tone.imageBorder)}>
                <div className="overflow-hidden rounded-[1.75rem]">
                  <OptimizedImage
                    src={story.image}
                    alt={story.imageAlt}
                    className="min-h-75 rounded-[1.75rem] transition-transform duration-900 ease-out group-hover:scale-105 md:min-h-95"
                    aspectRatio="portrait"
                    lazy={true}
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-linear-to-t from-slate-950/25 via-transparent to-white/10" />
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={VIEWPORT_OPTS}
                  transition={{ duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/50 bg-white/80 px-5 py-3.5 shadow-lg shadow-slate-900/8 backdrop-blur-md"
                >
                  <p className="text-sm font-medium leading-6 text-slate-700">
                    {story.imageCaption}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.article>
  );
};

const WhyContestHubNeedsToExist: React.FC = () => {
  const { locale } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const isEnglish = locale === 'en';
  const contestHubStories = isEnglish ? contestHubStoriesEn : contestHubStoriesVi;
  const introCopy = isEnglish
    ? {
      title: 'BLANC',
      subtitle: 'Beyound Learning And New Challenge',
      description:
        'Blanc is the website of F-Life Club at FPT Can Tho High School, founded by talented FPT students.',
      supporting:
        'We focus on mindset, soft skills, and creating opportunities for students who want to join competitions and projects across different fields.',
    }
    : {
      title: 'BLANC',
      subtitle: 'Beyound Learning And New Challenge',
      description:
        'Blanc là trang web của CLB F - Life trực thuộc Trường THPT FPT Cần Thơ, được thành lập bởi các bạn học sinh FPT tài năng.',
      supporting:
        'Chúng tôi chuyên về tư duy, kĩ năng mềm và tạo cơ hội cho các bạn học sinh có nhu cầu tham gia các cuộc thi, dự án ở các lĩnh vực khác nhau.',
    };

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

  return (
    <section ref={sectionRef} className="relative mt-20 mb-10">
      {/* Background glows */}
      <div className={cn(
        'pointer-events-none absolute inset-x-10 top-8 h-40 rounded-full bg-linear-to-r opacity-70 blur-3xl mask-[linear-gradient(to_bottom,black,transparent)] mask-no-repeat mask-size-[100%_100%] md:inset-x-20 md:top-10 lg:inset-x-32 lg:h-52',
        contestHubStoryTheme.sectionGlow,
      )} />
      <div className="pointer-events-none absolute left-8 top-24 h-40 w-40 rounded-full bg-primary-100/60 blur-3xl md:left-20" />
      <div className="pointer-events-none absolute right-4 top-1/3 h-44 w-44 rounded-full bg-amber-100/60 blur-3xl md:right-16" />

      {/* ─── Intro Card ─── */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT_OPTS}
        variants={fadeUp}
        custom={0}
        className="mx-auto w-full max-w-6xl"
      >
        <div className="relative overflow-hidden rounded-4xl border border-white/70 bg-white/90 px-6 py-8 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] ring-1 ring-white/70 backdrop-blur-sm md:px-10 md:py-10">
          <div className="absolute inset-0 bg-linear-to-br from-white via-primary-50/55 to-emerald-50/65" />
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-slate-200/90 to-transparent" />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_OPTS}
            className="relative mx-auto flex max-w-4xl flex-col items-center"
          >
            <motion.div variants={staggerChild} className="relative inline-flex h-24 w-24 items-center justify-center rounded-4xl border border-white/80 bg-white shadow-lg shadow-primary-200/50 ring-4 ring-primary-50/70">
              <div className="absolute inset-0 rounded-4xl bg-linear-to-br from-primary-100/75 via-white to-emerald-100/80" />
              <img src="/logo.png" alt="Blanc Logo" className="relative h-16 w-16 rounded-full object-cover shadow-sm" />
            </motion.div>

            <motion.h2
              variants={staggerChild}
              className={cn(
                'mt-6 text-3xl font-black tracking-tight text-slate-900 md:text-5xl',
                'bg-linear-to-r bg-clip-text text-transparent',
                contestHubStoryTheme.sectionTitle,
              )}
            >
              {introCopy.title}
            </motion.h2>

            <motion.p variants={staggerChild} className="mt-4 text-sm font-semibold uppercase tracking-[0.28em] text-primary-700 md:text-base">
              {introCopy.subtitle}
            </motion.p>

            <motion.p variants={staggerChild} className="mt-6 w-full max-w-3xl text-base leading-8 text-slate-600 md:max-w-none md:whitespace-nowrap md:text-lg">
              {introCopy.description}
            </motion.p>

            <motion.p variants={staggerChild} className="mt-3 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              {introCopy.supporting}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>

      {/* ─── Story Cards ─── */}
      <div className="mt-16 space-y-16 md:space-y-20 lg:space-y-24">
        {contestHubStories.map((story, index) => (
          <StoryCard key={story.id} story={story} index={index} />
        ))}
      </div>
    </section>
  );
};

export default WhyContestHubNeedsToExist;
