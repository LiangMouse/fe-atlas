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
  slug: string;
  title: string;
  level: "初级" | "中等";
  category: "JavaScript" | "TypeScript";
  duration: string;
  solvedCount: string;
  description: string[];
  example: string;
  starterCode: string;
  testScript: string;
  referenceSolution: string;
};

export const handwriteChallenges: HandwriteChallenge[] = [
  {
    slug: "debounce",
    title: "防抖",
    level: "中等",
    category: "JavaScript",
    duration: "15 分钟",
    solvedCount: "16.5k 完成",
    description: [
      "防抖是一种控制函数执行频率的技术。当函数被连续触发时，仅在停止触发一段时间后执行最后一次调用。",
      "实现 debounce(fn, wait)，返回一个新函数。连续触发时仅最后一次调用生效，且需要保留 this 与参数。",
    ],
    example: `let i = 0;
function increment() {
  i += 1;
}

const debouncedIncrement = debounce(increment, 100);
debouncedIncrement();
debouncedIncrement();

// 100ms 后，i === 1`,
    starterCode: `function debounce(fn, wait) {
  // TODO: implement debounce
}
`,
    referenceSolution: `/**
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
function debounce(fn, wait) {
  let timerId = null;
  return function debounced(...args) {
    const context = this;
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => {
      fn.apply(context, args);
    }, wait);
  };
}
`,
    testScript: `
const checks = [];
if (typeof debounce !== "function") {
  throw new Error("请先定义 debounce 函数");
}

let count = 0;
const debounced = debounce(() => {
  count += 1;
}, 40);

debounced();
debounced();
debounced();
await new Promise((resolve) => setTimeout(resolve, 80));
checks.push(count === 1);

const ctx = { total: 0 };
const wrapped = debounce(function (n) {
  this.total += n;
}, 30);
wrapped.call(ctx, 1);
wrapped.call(ctx, 3);
await new Promise((resolve) => setTimeout(resolve, 60));
checks.push(ctx.total === 3);

return {
  passed: checks.filter(Boolean).length,
  total: checks.length,
  checks,
};
`,
  },
  {
    slug: "event-emitter",
    title: "手写 EventEmitter",
    level: "中等",
    category: "TypeScript",
    duration: "20 分钟",
    solvedCount: "9.3k 完成",
    description: [
      "实现一个最小可用的事件系统，支持 on/off/emit。",
      "要求监听器按注册顺序执行，off 删除对应回调后不再触发。",
    ],
    example: `const emitter = createEmitter();
const logs = [];
const fn = (n) => logs.push(n);

emitter.on('tick', fn);
emitter.emit('tick', 1);
emitter.off('tick', fn);
emitter.emit('tick', 2);

// logs => [1]`,
    starterCode: `function createEmitter() {
  // TODO: implement on / off / emit
  return {
    on() {},
    off() {},
    emit() {},
  };
}
`,
    referenceSolution: `type Handler = (...args: unknown[]) => void;

function createEmitter() {
  const eventMap = new Map<string, Set<Handler>>();

  return {
    on(event, handler) {
      const handlers = eventMap.get(event) ?? new Set<Handler>();
      handlers.add(handler);
      eventMap.set(event, handlers);
    },
    off(event, handler) {
      const handlers = eventMap.get(event);
      if (!handlers) return;
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventMap.delete(event);
      }
    },
    emit(event, ...args) {
      const handlers = eventMap.get(event);
      if (!handlers) return;
      handlers.forEach((handler) => handler(...args));
    },
  };
}
`,
    testScript: `
if (typeof createEmitter !== "function") {
  throw new Error("请先定义 createEmitter 函数");
}

const emitter = createEmitter();
const logs = [];
const fn = (n) => logs.push(n);

emitter.on("tick", fn);
emitter.emit("tick", 1);
emitter.off("tick", fn);
emitter.emit("tick", 2);

const checks = [
  Array.isArray(logs),
  logs.length === 1,
  logs[0] === 1,
];

return {
  passed: checks.filter(Boolean).length,
  total: checks.length,
  checks,
};
`,
  },
  {
    slug: "throttle",
    title: "节流",
    level: "初级",
    category: "JavaScript",
    duration: "15 分钟",
    solvedCount: "11.2k 完成",
    description: [
      "节流在固定时间窗口内最多执行一次，适合滚动、拖拽等高频触发场景。",
      "实现 throttle(fn, wait)，并保证参数透传。",
    ],
    example: `let called = 0;
const fn = throttle(() => called++, 100);

fn(); // called = 1
fn(); // ignored
// 100ms later
fn(); // called = 2`,
    starterCode: `function throttle(fn, wait) {
  // TODO: implement throttle
}
`,
    referenceSolution: `/**
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
function throttle(fn, wait) {
  let lastInvoke = 0;
  return function throttled(...args) {
    const now = Date.now();
    if (now - lastInvoke < wait) {
      return;
    }
    lastInvoke = now;
    fn.apply(this, args);
  };
}
`,
    testScript: `
if (typeof throttle !== "function") {
  throw new Error("请先定义 throttle 函数");
}

let count = 0;
const fn = throttle(() => {
  count += 1;
}, 50);

fn();
fn();
await new Promise((resolve) => setTimeout(resolve, 10));
fn();
await new Promise((resolve) => setTimeout(resolve, 70));
fn();

const checks = [count === 2];

return {
  passed: checks.filter(Boolean).length,
  total: checks.length,
  checks,
};
`,
  },
];

export function getChallengeBySlug(slug: string) {
  return handwriteChallenges.find((item) => item.slug === slug);
}
