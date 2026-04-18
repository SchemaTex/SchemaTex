import { render } from 'schematex';

const cases: [string, string][] = [
  [
    'TC-FB-01 · Website traffic drop (6 categories · 24 causes)',
    `fishbone "Fishbone diagram — 网站流量下跌原因分析"

effect "流量下跌"

category content     "内容 Content"
category tech        "技术 Technical"
category links       "外链 Backlinks"
category ux          "体验 UX"
category competition "竞争 Competition"
category algo        "算法 Algorithm"

content : "更新频率下降"
content : "同质化严重"
content : "关键词未覆盖"
content : "AI 内容质量低"

tech : "Core Web Vitals 差"
tech : "索引覆盖率下降"
tech : "爬虫被 WAF 拦截"
tech : "结构化数据缺失"

links : "高质量外链流失"
links : "低质量链接占比高"
links : "引荐域名停滞"
links : "锚文本多样性低"

ux : "跳出率上升"
ux : "移动端体验差"
ux : "首屏加载慢"
ux : "弹窗广告过多"

competition : "新对手涌入"
competition : "AI 工具替代搜索"
competition : "品牌心智减弱"
competition : "对手内容更新快"

algo : "Core Update 惩罚"
algo : "E-E-A-T 信号不足"
algo : "AIO / SGE 截流"
algo : "意图匹配漂移"`,
  ],
  [
    'TC-FB-02 · Manufacturing 6M (Level-2 sub-causes)',
    `fishbone "Welding defect — surface porosity"

effect "表面气孔缺陷"

category man         "Man · 人"
category method      "Method · 方法"
category machine     "Machine · 机器"
category material    "Material · 材料"
category measurement "Measurement · 测量"
category env         "Environment · 环境"

man : "焊工培训不足"
man : "班次疲劳"

method : "电流参数偏低"
method : "预热温度不达标"
method : "保护气流量设置错误"

machine : "焊枪喷嘴磨损"
machine : "送丝机打滑"

material : "母材表面油污"
material : "焊丝受潮"
  - "仓储湿度 > 60%"
  - "开封后未回烘"

measurement : "游标卡尺未校准"
measurement : "气流表读数偏差"

env : "车间湿度过高"
env : "通风导致保护气扰动"`,
  ],
  [
    'TC-FB-03 · Software incident RCA',
    `fishbone "API P1 incident · latency spike 2026-03-12"

effect "API P99 latency 从 200ms → 3.2s"

category deploy   "Deploy"
category deps     "Dependencies"
category db       "Database"
category network  "Network"
category code     "Code"
category observe  "Observability"

deploy : "canary % 过高"
deploy : "回滚耗时 12min"

deps : "第三方 SDK 引入新版"
deps : "auth 服务 p95 飙升"

db : "连接池耗尽"
db : "慢查询（未加索引）"
  - "新 feature 未审 query plan"

network : "单 AZ 丢包"
network : "ALB 健康检查超时"

code : "N+1 query 回归"
code : "并发锁退化"

observe : "警报阈值过高"
observe : "dashboard 缺少 p99 指标"`,
  ],
  [
    'TC-FB-04 · Small fishbone (4 categories)',
    `fishbone "学生考试失利"

effect "期末不及格"

category study    "学习方法"
category health   "身心状态"
category external "外部"
category teach    "教学"

study : "复习不充分"
study : "笔记混乱"

health : "考前失眠"
health : "焦虑"

external : "家庭干扰"

teach : "考试范围未覆盖"
teach : "题型训练少"`,
  ],
  [
    'TC-FB-05 · Healthcare RCA (5 categories)',
    `fishbone "Medication administration error"

effect "Patient received wrong dose"

category methods  "Methods"
category material "Materials"
category machines "Machines"
category manpower "Manpower"
category patient  "Patients"

methods : "Double-check not performed"
methods : "Order transcription error"

material : "Similar-looking vial labels"
material : "Same strength multi-vial"

machines : "Pump default profile not updated"
machines : "Barcode scanner misread"

manpower : "Staffing shortage"
manpower : "Trainee unsupervised"

patient : "ID band missing"
patient : "Allergy not flagged"`,
  ],
  [
    'TC-FB-06 · Compact shorthand DSL',
    `fishbone "Late delivery"

effect "Late delivery to customer"

category People: training gap; staffing shortfall
category Process: approval delays; handoff gaps; no SLA
category Machine: downtime; maintenance deferred
category Materials: vendor quality; stock-outs`,
  ],
];

function DiagramCase({ label, src }: { label: string; src: string }) {
  let svg: string;
  try {
    svg = render(src);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    svg = `<pre style="color:#c00;padding:12px">${msg}</pre>`;
  }

  return (
    <section className="mb-12">
      <h2 className="mb-3 text-sm font-semibold text-zinc-500 border-b border-zinc-200 pb-2">
        {label}
      </h2>
      <details className="mb-3">
        <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-600 select-none">
          Show DSL source
        </summary>
        <pre className="mt-2 rounded-md bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-700 overflow-x-auto whitespace-pre-wrap">
          {src}
        </pre>
      </details>
      <div
        className="rounded-lg border border-zinc-200 bg-white p-5 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </section>
  );
}

export default function FishbonePreviewPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">Fishbone (Ishikawa) Diagram</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Cause-and-effect analysis · 6M / 8P / 4S frameworks · Level-2 sub-causes
          </p>
        </div>
        {cases.map(([label, src]) => (
          <DiagramCase key={label} label={label} src={src} />
        ))}
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Fishbone Preview',
  description: 'Ishikawa cause-and-effect diagram preview',
};
