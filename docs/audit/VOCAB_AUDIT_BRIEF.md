# 词汇考题审核 brief (给 4 个数据审核 agent)

背景: 新加坡 PSLE 备考 app, 孩子 P5 (2027.9 考), 英语目标 AL1。单词闪卡 1067 词, 每词按词条自己的 中文释义(zh)/英文释义(en)/例句(eg)/手写题(quiz) 自动生成四种考题:
- meaning: 例句里划出该词, 从 4 个英文释义里选最接近的 (PSLE Booklet A Vocabulary MCQ 样式)
- define: 给英文释义选词 (4 选 1)
- cloze: 例句挖空选词 (只用于短语动词/搭配/习语/连接词卡组)
- hand: 手写的四选一 (quiz 字段)
干扰项从同一卡组里挑, 规则: 释义不共用实词、中文不同、词干前 5 字母不同、不是同一个 iWrite 替换源 (root)。

你要审的文件 (同目录): `vocab_words_N.json` (词条) 和 `vocab_quiz_N.json` (由这些词条生成的题, 含 opts 和 correct)。

## 审什么 (逐词, 一个不漏)
1. zh 中文释义对不对, 是否贴合 PSLE 语境下最常用的义项 (不要生僻义)
2. en 英文释义对不对、是否清晰到小学生能懂、是否能唯一指向这个词 (太泛的释义如 "to do something" 会让 define 题出现多个可选)
3. eg 例句: 语法对不对、是否真的用了这个词 (含变形)、语境是否能推出词义 (meaning 题要靠语境)、是否新加坡/PSLE 风格、有没有事实或文化错误
4. quiz 手写题 (若有): 答案唯一且正确, 题干自然
5. 生成题 (vocab_quiz_N.json): 看每道题 4 个选项里是不是只有 correct 一个对; 若某干扰项在该语境下也说得通 → 记 quizIssues。define 题若释义太泛 → 改 en。

## 额外产出: 每词考点解析 tip
给每个词写一条中文 tip (≤60 字), 给孩子答完题看的"考点解析": 这个词 PSLE 怎么考 / 常见搭配 / 易混词区分 / 词性或语法注意。要具体, 不要"这个词很常用"这种废话。例: "snarled: '怒声说'类 said 替换词, 作文对话里用; 别和 snared(诱捕) 混。常接 at sb"。

## 输出 (严格 JSON, 写到同目录 `vocab_findings_N.json`)
```json
{
  "fixes": [ { "w": "词", "field": "zh|en|eg|quiz", "issue": "问题", "fix": <新值: zh/en/quiz 为字符串, eg 为完整新例句数组> } ],
  "quizIssues": [ { "w": "词", "type": "meaning|define|cloze|hand", "issue": "哪两个选项都说得通", "banPair": ["词A", "词B"] } ],
  "tips": { "词": "tip 文字", ... 每个词都要有 }
}
```
- fixes 只记真有问题的; 没问题的不要为了凑数改
- banPair = 这两个词不应互为干扰项 (我会加到排斥表)
- 所有中文用简体, 英文例句用英式拼写 (colour, realise)
- 写完自己用 node 把 JSON parse 一遍确认合法, 并确认 tips 的 key 数 = 词条数
