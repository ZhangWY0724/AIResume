import {
  DEFAULT_EDITOR_ACCENT,
  DEFAULT_EDITOR_LINE_HEIGHT,
  DEFAULT_EDITOR_MODULES,
  DEFAULT_EDITOR_PAGE_SPACING,
} from './templates';
import type {
  ResumeEditorDocument,
  ResumeEditorDraft,
  ResumeEditorEducationItem,
  ResumeEditorExperienceItem,
  ResumeEditorProjectItem,
} from './types';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_REGEX = /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/;
const DATE_RANGE_REGEX = /((?:19|20)\d{2}[./-]?(?:0?[1-9]|1[0-2])?)[\s至~-]+((?:至今|现在)|(?:19|20)\d{2}[./-]?(?:0?[1-9]|1[0-2])?)/;

const SKILL_KEYWORDS = [
  'React',
  'Vue',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Next.js',
  'Tailwind CSS',
  'CSS',
  'HTML',
  'Python',
  'Java',
  'Spring',
  'SQL',
  'Redis',
  'Docker',
  'Kubernetes',
  'AWS',
  'Git',
];

function createId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function detectDegree(text: string): string {
  if (/博士/i.test(text)) return '博士';
  if (/硕士|研究生/i.test(text)) return '硕士';
  if (/mba/i.test(text)) return 'MBA';
  if (/本科/i.test(text)) return '本科';
  if (/专科|大专/i.test(text)) return '专科';
  return '';
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

function toParagraphs(text: string): string[] {
  return normalizeText(text)
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, ' ').trim())
    .filter(Boolean);
}

function toLines(text: string): string[] {
  return normalizeText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractSectionParagraphs(
  paragraphs: string[],
  headingKeywords: string[],
): string[] {
  const results: string[] = [];

  for (let i = 0; i < paragraphs.length; i += 1) {
    const paragraph = paragraphs[i];
    if (!headingKeywords.some((keyword) => paragraph.includes(keyword))) {
      continue;
    }

    for (let j = i + 1; j < paragraphs.length; j += 1) {
      const next = paragraphs[j];
      if (/工作经历|项目经历|教育经历|专业技能|个人评价|自我评价|技能标签/.test(next)) {
        break;
      }

      results.push(next);
    }

    if (results.length > 0) {
      return results;
    }
  }

  return [];
}

function extractName(lines: string[]): string {
  const firstLine = lines[0] ?? '';
  if (!firstLine || firstLine.includes('@') || /\d/.test(firstLine) || firstLine.length > 20) {
    return '未命名候选人';
  }

  return firstLine;
}

function extractSkills(text: string): string[] {
  return SKILL_KEYWORDS.filter((skill) =>
    new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text),
  );
}

function extractSummary(paragraphs: string[]): string {
  if (paragraphs.length === 0) {
    return '请补充个人优势、岗位方向和代表性成果。';
  }

  const summaryBlock = paragraphs.find((paragraph) => paragraph.length >= 40) ?? paragraphs[0];
  return summaryBlock.slice(0, 220);
}

function createPlaceholderExperience(paragraphs: string[]): ResumeEditorExperienceItem[] {
  const sectionParagraphs = extractSectionParagraphs(paragraphs, ['工作经历', '工作经验', '职业经历']);
  const source = sectionParagraphs.length > 0 ? sectionParagraphs : paragraphs;

  const candidates = source
    .filter((paragraph) => DATE_RANGE_REGEX.test(paragraph) || /公司|任职|负责|主导|推动/.test(paragraph))
    .slice(0, 2);

  if (candidates.length === 0) {
    return [];
  }

  return candidates.map((paragraph, index) => {
    const dateMatch = paragraph.match(DATE_RANGE_REGEX);

    return {
      id: createId('exp', index),
      company: `待补充公司 ${index + 1}`,
      role: `待补充岗位 ${index + 1}`,
      period: dateMatch ? `${dateMatch[1]} - ${dateMatch[2]}` : '待补充时间',
      bullets: [paragraph.slice(0, 120)],
    };
  });
}

function createPlaceholderProjects(paragraphs: string[]): ResumeEditorProjectItem[] {
  const sectionParagraphs = extractSectionParagraphs(paragraphs, ['项目经历', '项目经验', '项目背景']);
  const source = sectionParagraphs.length > 0 ? sectionParagraphs : paragraphs;

  const candidates = source
    .filter((paragraph) => /项目|系统|平台|优化|搭建|负责/.test(paragraph))
    .slice(0, 2);

  if (candidates.length === 0) {
    return [];
  }

  return candidates.map((paragraph, index) => ({
    id: createId('project', index),
    name: `待补充项目 ${index + 1}`,
    role: '待补充角色',
    bullets: [paragraph.slice(0, 120)],
  }));
}

function createPlaceholderEducation(lines: string[]): ResumeEditorEducationItem[] {
  const candidates = lines
    .filter((line) => /大学|学院|硕士|本科|博士|专科/.test(line))
    .slice(0, 2);

  return candidates.map((line, index) => ({
    id: createId('edu', index),
    school: line,
    degree: detectDegree(line),
    major: '',
    period: '待补充时间',
  }));
}

export function createDraftFromResumeText(text: string): ResumeEditorDraft {
  const normalized = normalizeText(text);
  const lines = toLines(normalized);
  const paragraphs = toParagraphs(normalized);

  const document: ResumeEditorDocument = {
    profile: {
      name: extractName(lines),
      title: '',
      phone: normalized.match(PHONE_REGEX)?.[0] ?? '',
      email: normalized.match(EMAIL_REGEX)?.[0] ?? '',
      location: '',
    },
    summary: extractSummary(paragraphs),
    skills: extractSkills(normalized),
    experience: createPlaceholderExperience(paragraphs),
    projects: createPlaceholderProjects(paragraphs),
    education: createPlaceholderEducation(lines),
    sourceText: normalized,
  };

  return {
    templateId: 'classic',
    modules: DEFAULT_EDITOR_MODULES,
    hiddenModules: {},
    appearance: {
      accentColor: DEFAULT_EDITOR_ACCENT,
      fontScale: 'md',
      pageSpacing: DEFAULT_EDITOR_PAGE_SPACING,
      lineHeight: DEFAULT_EDITOR_LINE_HEIGHT,
    },
    document,
  };
}
