import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_SOURCE = 'packages/plugin-center/registry/plugins.full.json'
const DEFAULT_OUTPUT = 'packages/plugin-center/registry/plugins.json'

export const MARKETING_PLUGIN_SEO = {
  'anysearch-anysearch-dsh': {
    seoTagsZh: ['SEO关键词研究', '市场趋势分析', '竞品内容调研', '搜索营销洞察', '内容选题研究'],
    seoTagsEn: ['SEO keyword research', 'market trend analysis', 'competitor content research', 'search marketing insights', 'content topic discovery'],
  },
  'dsh-all-search': {
    seoTagsZh: ['多源搜索营销', 'SEO关键词挖掘', '竞品研究工具', '市场情报搜索', '内容营销调研'],
    seoTagsEn: ['multi-source marketing search', 'SEO keyword discovery', 'competitor research tool', 'market intelligence search', 'content marketing research'],
  },
  'dsh-web-search-pro': {
    seoTagsZh: ['社交媒体监听', 'SEO关键词研究', '内容趋势分析', '竞品情报监测', '多平台营销搜索'],
    seoTagsEn: ['social media listening', 'SEO keyword research', 'content trend analysis', 'competitive intelligence monitoring', 'multi-platform marketing search'],
  },
  'yangzhe1003-dsh-web-search-firecrawl': {
    seoTagsZh: ['网站内容抓取', 'SEO竞品分析', '营销页面研究', '内容审计工具', '搜索营销数据'],
    seoTagsEn: ['website content crawling', 'SEO competitor analysis', 'marketing page research', 'content audit tool', 'search marketing data'],
  },
  'dsh-web-search-brave': {
    seoTagsZh: ['Brave搜索营销', 'SEO关键词调研', '市场趋势搜索', '竞品网站研究', '内容营销洞察'],
    seoTagsEn: ['Brave search marketing', 'SEO keyword research', 'market trend search', 'competitor website research', 'content marketing insights'],
  },
  'dsh-web-search-tavily': {
    seoTagsZh: ['Tavily营销搜索', 'SEO内容研究', '行业趋势分析', '竞品情报搜索', '营销选题发现'],
    seoTagsEn: ['Tavily marketing search', 'SEO content research', 'industry trend analysis', 'competitive intelligence search', 'marketing topic discovery'],
  },
  'dsh-tavily-search': {
    seoTagsZh: ['免费营销搜索', 'SEO关键词发现', '市场调研助手', '内容选题工具', '竞品搜索分析'],
    seoTagsEn: ['free marketing search', 'SEO keyword discovery', 'market research assistant', 'content ideation tool', 'competitor search analysis'],
  },
  'tonydua-dsh-web-search-exa': {
    seoTagsZh: ['Exa语义搜索', 'SEO内容发现', '竞品内容分析', '市场研究工具', '营销知识检索'],
    seoTagsEn: ['Exa semantic search', 'SEO content discovery', 'competitor content analysis', 'market research tool', 'marketing knowledge retrieval'],
  },
  'bocha-ai-dsh-web-search-bocha': {
    seoTagsZh: ['中文营销搜索', '国内市场调研', 'SEO关键词研究', '竞品内容监测', '中文内容选题'],
    seoTagsEn: ['Chinese marketing search', 'China market research', 'SEO keyword research', 'competitor content monitoring', 'Chinese content ideation'],
  },
  'dsh-web-search-tokenrhythm': {
    seoTagsZh: ['AI营销搜索', '实时市场研究', 'SEO内容调研', '竞品信息搜索', '营销趋势发现'],
    seoTagsEn: ['AI marketing search', 'real-time market research', 'SEO content research', 'competitor information search', 'marketing trend discovery'],
  },
  'dsh-web-access': {
    seoTagsZh: ['营销网页研究', '多渠道内容采集', '竞品资料提取', 'SEO内容分析', '视频内容调研'],
    seoTagsEn: ['marketing web research', 'multi-channel content collection', 'competitor data extraction', 'SEO content analysis', 'video content research'],
  },
  'dsh-rss': {
    seoTagsZh: ['内容监测', '行业资讯追踪', '品牌舆情监测', '内容营销选题', 'RSS营销订阅'],
    seoTagsEn: ['content monitoring', 'industry news tracking', 'brand mention monitoring', 'content marketing ideas', 'RSS marketing feeds'],
  },
  'dsh-humanizer': {
    seoTagsZh: ['中文内容优化', '营销文案润色', '品牌内容创作', 'AI文案改写', '内容营销写作'],
    seoTagsEn: ['Chinese content optimization', 'marketing copy editing', 'brand content creation', 'AI copy rewriting', 'content marketing writing'],
  },
  'zseven-w-dsh-openpencil': {
    seoTagsZh: ['营销视觉设计', '品牌素材设计', '社交媒体图片', '广告创意设计', '可视化内容制作'],
    seoTagsEn: ['marketing visual design', 'brand asset design', 'social media graphics', 'advertising creative design', 'visual content creation'],
  },
  'huanlin-dsh-plugin-aigc-canvas': {
    seoTagsZh: ['AI营销素材', '创意内容生成', '品牌视觉设计', '广告素材生成', '社交媒体创意'],
    seoTagsEn: ['AI marketing assets', 'creative content generation', 'brand visual design', 'advertising asset generation', 'social media creatives'],
  },
  'dsh-nanobananapro': {
    seoTagsZh: ['AI图片生成', 'AI视频生成', '营销素材制作', '广告创意生成', '社交媒体内容'],
    seoTagsEn: ['AI image generation', 'AI video generation', 'marketing asset creation', 'advertising creative generation', 'social media content'],
  },
  'dsh-seedance2': {
    seoTagsZh: ['AI视频营销', '短视频生成', '广告视频制作', '社交媒体视频', '品牌视频内容'],
    seoTagsEn: ['AI video marketing', 'short-form video generation', 'advertising video production', 'social media video', 'brand video content'],
  },
  'dsh-pixluna': {
    seoTagsZh: ['营销图片素材', '品牌视觉素材', '社交媒体配图', '内容营销图片', '创意资产管理'],
    seoTagsEn: ['marketing image assets', 'brand visual assets', 'social media imagery', 'content marketing images', 'creative asset management'],
  },
  'dsh-email': {
    seoTagsZh: ['邮件营销', '客户触达', '营销自动化', '潜在客户培育', 'EDM营销'],
    seoTagsEn: ['email marketing', 'customer outreach', 'marketing automation', 'lead nurturing', 'email campaign management'],
  },
  'dsh-report-html': {
    seoTagsZh: ['营销数据报告', '营销效果可视化', '活动复盘报告', '交互式营销报表', '营销分析展示'],
    seoTagsEn: ['marketing data reports', 'marketing performance visualization', 'campaign reporting', 'interactive marketing dashboards', 'marketing analytics presentation'],
  },
}

export function createMarketingManifest(fullManifest) {
  if (fullManifest?.schemaVersion !== '1.0' || !Array.isArray(fullManifest.plugins)) {
    throw new Error('source must be a Manifest V1 document')
  }
  const sourceIds = new Set(fullManifest.plugins.map(plugin => plugin.id))
  const missing = Object.keys(MARKETING_PLUGIN_SEO).filter(id => !sourceIds.has(id))
  if (missing.length > 0) throw new Error(`marketing plugins missing from full Manifest: ${missing.join(', ')}`)

  const plugins = fullManifest.plugins
    .filter(plugin => Object.hasOwn(MARKETING_PLUGIN_SEO, plugin.id))
    .map((plugin) => {
      const seo = MARKETING_PLUGIN_SEO[plugin.id]
      validateSeoTags(plugin.id, seo)
      return { ...plugin, seoTagsZh: seo.seoTagsZh, seoTagsEn: seo.seoTagsEn }
    })
  return { ...fullManifest, plugins }
}

export async function buildMarketingManifest({ source = DEFAULT_SOURCE, output = DEFAULT_OUTPUT } = {}) {
  const fullManifest = JSON.parse(await readFile(resolve(source), 'utf8'))
  const marketingManifest = createMarketingManifest(fullManifest)
  await writeFile(resolve(output), `${JSON.stringify(marketingManifest, null, 2)}\n`, 'utf8')
  return marketingManifest
}

function validateSeoTags(id, seo) {
  for (const [field, values] of Object.entries(seo)) {
    if (!Array.isArray(values) || values.length < 5 || values.some(value => typeof value !== 'string' || value.trim() === '')) {
      throw new Error(`${id}.${field} must contain at least five non-empty tags`)
    }
    if (new Set(values).size !== values.length) throw new Error(`${id}.${field} contains duplicate tags`)
  }
  if (!seo.seoTagsZh.every(tag => /[\u3400-\u9fff]/u.test(tag))) {
    throw new Error(`${id}.seoTagsZh must contain Chinese tags`)
  }
  if (!seo.seoTagsEn.every(tag => /^[\x20-\x7e]+$/u.test(tag))) {
    throw new Error(`${id}.seoTagsEn must contain English tags`)
  }
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isEntrypoint) {
  buildMarketingManifest()
    .then(manifest => console.log(`wrote ${manifest.plugins.length} marketing plugins to ${DEFAULT_OUTPUT}`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    })
}
