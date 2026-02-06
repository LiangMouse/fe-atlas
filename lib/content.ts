export type Topic = {
  title: string;
  digest: string;
  tags: string[];
};

export const interviewNotes: Topic[] = [
  {
    title: "浏览器渲染流水线（从 HTML 到像素）",
    digest: "DOM/CSSOM 合并、Layout、Paint、Composite 的触发条件与优化手段。",
    tags: ["浏览器", "性能", "渲染"],
  },
  {
    title: "HTTP 缓存与协商缓存",
    digest: "Cache-Control、ETag、If-None-Match 在静态资源版本管理中的组合策略。",
    tags: ["网络", "HTTP"],
  },
  {
    title: "事件循环与微任务",
    digest: "Node 与浏览器事件循环差异，Promise/Microtask 与宏任务执行时机。",
    tags: ["JavaScript", "异步"],
  },
  {
    title: "React 并发渲染与调度",
    digest: "批处理、优先级、可中断渲染和 UI 响应速度之间的关系。",
    tags: ["React", "架构"],
  },
];

export const algorithmSets: Topic[] = [
  {
    title: "双指针与滑动窗口",
    digest: "覆盖去重、子数组窗口、最短/最长区间问题的通用模板。",
    tags: ["数组", "字符串", "中频"],
  },
  {
    title: "二叉树遍历与回溯",
    digest: "DFS/BFS、路径收集、剪枝思路与递归栈空间分析。",
    tags: ["树", "递归"],
  },
  {
    title: "动态规划入门框架",
    digest: "状态定义、转移方程、初始化与滚动数组降维。",
    tags: ["DP", "高频"],
  },
  {
    title: "图论：拓扑排序",
    digest: "课程表、依赖图检测环与入度队列实现。",
    tags: ["图", "BFS"],
  },
];

export type HandwriteChallenge = {
  id: string;
  title: string;
  level: "初级" | "中级";
  prompt: string;
  functionName: string;
  starterCode: string;
  samples: Array<{
    args: unknown[];
    expected: unknown;
  }>;
};

export const handwriteChallenges: HandwriteChallenge[] = [
  {
    id: "event-emitter",
    title: "手写 EventEmitter（核心功能）",
    level: "中级",
    prompt:
      "实现 on/off/emit。on 注册监听，off 删除指定监听，emit 触发同名事件并按注册顺序执行。",
    functionName: "createEmitter",
    starterCode: `function createEmitter() {
  // TODO: return { on, off, emit }
  return {
    on() {},
    off() {},
    emit() {},
  }
}
`,
    samples: [
      {
        args: [],
        expected: "ok",
      },
    ],
  },
  {
    id: "debounce",
    title: "手写 debounce",
    level: "初级",
    prompt:
      "实现 debounce(fn, wait)。在 wait 时间内重复调用只执行最后一次，返回可调用的新函数。",
    functionName: "debounce",
    starterCode: `function debounce(fn, wait) {
  // TODO
}
`,
    samples: [
      {
        args: [],
        expected: "ok",
      },
    ],
  },
];
