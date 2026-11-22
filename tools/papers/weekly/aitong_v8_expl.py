# -*- coding: utf-8 -*-
# 简练版: 每题 = 题干 / 他写与答案 / 为什么 (1-2 句) / 记住 (1 句) / 做法 (1-2 句)
EXPL = [
    ('Booklet A 选择题（丢 7 分）', [
        ('第 10 题　Ashley and her groupmates ______ on a coding project together last year.', '他选 (4) have worked，答案 (2) worked。', [
            '为什么：句尾 last year 是已经结束的过去时间，只能用一般过去时。现在完成时要有 since、for 加时长、so far、already、yet 这类连到现在的信号词。',
            '记住：last year / ago / yesterday → 过去时；since / for / so far / yet → 现在完成时。两套信号词不会同时出现。',
            '做法：先圈时间词，按词定时态，再看主语单复数。不要被 together、still 这类词带偏。',
        ]),
        ('第 12 题　Mrs Tan gave Mia a letter of ______ to praise her for her outstanding contributions.', '他选 (3) appreciation，答案 (4) commendation。', [
            '为什么：题干说 to praise，是表扬。letter of commendation 是表扬信；appreciation 是感谢，letter of appreciation 是感谢信。',
            '记住：commendation 表扬，appreciation 感谢，honour 荣誉，support 支持。',
            '做法：先圈题干里的提示词（praise），再找和它同义的选项。四个都认识还选错，就是没对准提示词。',
        ]),
        ('第 17 题　before piecing together a stunning necklace', '他选 (1) linking，答案 (4) assembling。', [
            '为什么：piece together 是把很多小块拼成一个成品，等于 assemble。linking 只是“连起来”，没有“做成整体”的意思。',
            '记住：piece together = put together = assemble。',
            '做法：读完整句想清楚画面（贝壳拼成项链），把四个选项代回去读，选最顺的。',
        ]),
        ('第 18 题　The shells held cherished memories close to her heart', '他选 (1) vivid，答案 (2) fond。', [
            '为什么：cherished 是“珍爱的”，说感情，对应 fond memories。vivid 是“清晰的”，说记得清不清楚。后文 close to her heart 也在提示是感情。',
            '记住：cherished = fond = treasured（珍爱）；vivid = clear（清晰）。',
            '做法：memories 前的形容词，先分清说的是“感情”还是“清晰度”，再在同一类里选。',
        ]),
        ('第 19 题　their first school excursion to the beach', '他选 (2) journey，答案 (1) outing。', [
            '为什么：excursion 是短途郊游，等于 outing。journey 是长途旅程，expedition 是远征，adventure 是冒险，都太重。',
            '记住：excursion = outing = trip（短途）；journey = voyage（长途）。',
            '做法：先掂量划线词的分量（小学生去海边半天，是轻的），选分量相同的词。',
        ]),
        ('第 23 题　Based on the poster in Text 1, which of the following best fits the purpose of this text?', '他选 (2) explain，答案 (4) persuade。', [
            '为什么：领养海报，标题 THEY HAVE BEEN WAITING 打感情牌，目的是让你来领养，是 persuade。海报上的时间地点只是手段。',
            '记住：海报、广告 → persuade；通知、新闻 → inform；说明书、科普 → explain；故事 → entertain。',
            '做法：问整张海报的目的按文本类型答；问某个标点、某句话的作用，答那个局部的作用，不套 persuade。',
        ]),
        ('第 24 题　Based on Text 2, Lily has to ensure that ______ before she decides to adopt a pet.', '他选 (3) the checklist for pet adoption is completed，答案 (4) having a pet will not disrupt her studies and lifestyle。', [
            '为什么：Text 2 清单里写的是“能兼顾学习和生活再养宠物”。题目问要确保的“事”，答案是清单里的条件，不是“完成清单”这个动作。',
            '记住：问 ensure that 什么，答事实，不答工具。',
            '做法：选之前回文本把支撑那个选项的原句划出来，划不出来的不选。选项里加了 all、only、ensure 把话说满的，多半是干扰项。',
        ]),
    ]),
    ('Editing 改错（丢 2 分）', [
        ('第 40 题　to confirm their compatible', '他写 compatibleness，答案 compatibility。', [
            '为什么：their 后面要名词，方向对了，但 compatible 的名词是 compatibility。-able / -ible 结尾的形容词变名词是 -ability / -ibility，不加 -ness。',
            '记住：able → ability，responsible → responsibility，available → availability，compatible → compatibility。',
            '做法：their / the / of 后面跟着形容词，就是要改名词；词尾按整套记，拼错一个字母整题 0 分。',
        ]),
        ('第 42 题　Some birds were also trained to volunteer enter pet crates', '他空着，答案 voluntarily。', [
            '为什么：volunteer enter 两个动词连用不通。enter 是动作，前面要副词说“怎么进”：voluntarily。',
            '记住：volunteer 动词或名词，voluntary 形容词，voluntarily 副词。修饰动词用副词 -ly。',
            '做法：改错不留空。每题 1 分没有倒扣，知道方向就写。',
        ]),
    ]),
    ('综合填空（丢 9 分）', [
        ('第 47 题　various activities that maintain our ______ hygiene, like bathing and brushing our teeth', '他写 physical，答案 personal。', [
            '为什么：personal hygiene 是固定搭配“个人卫生”，英文里不说 physical hygiene。',
            '记住：personal hygiene；其次 oral hygiene、food hygiene。',
            '做法：搭配空不看中文意思对不对，看英文有没有这个说法，按最常见的搭配填。',
        ]),
        ('第 48 题　would be nearly ______ to do', '他写 unable，答案 impossible。', [
            '为什么：主语是 activities（事）。“事做不成”用 impossible；unable 的主语只能是人。',
            '记住：impossible 说事，unable 说人。',
            '做法：be ___ to do 的空，先看主语是人还是事。',
        ]),
        ('第 49 题　Sea water ______ up about 97% of all water on Earth', '他写 contains，答案 makes。', [
            '为什么：空格后面有 up，make up 是“占（比例）”。contains up 不存在。',
            '记住：make up 占；keep up 跟上；take up 占用；set up 建立。',
            '做法：填动词前先看空格后面的小词（up / off / out / by / for），有就连着想短语动词。',
        ]),
        ('第 50 题　Even ______, a large portion is locked in the world\'s tallest mountains and ice caps', '他空着，答案 so。', [
            '为什么：上句说只剩 3% 淡水，这句说这 3% 还有一大半冻着，要“即便如此”：Even so。Even 后面直接是逗号，不能接 though / if。',
            '记住：even so 即便如此；even then 即便那时；even though / if 后面要跟句子。',
            '做法：承接词空能填的词很少，挨个试，排除掉不合语法的，剩下的就是答案。不要空着。',
        ]),
        ('第 51 题　the world\'s tallest mountains and ice caps, ______ prevents us from using it', '他写 to，答案 which。', [
            '为什么：逗号后面是带动词 prevents 的完整句子，补充说明前面整件事，用关系代词 which。to 后面只能接原形，接不了 prevents。',
            '记住：名词 + 逗号 + 完整句 → which（物）/ who（人）/ where（地点）。',
            '做法：看到空格后面是带 s 或 ed 的动词，先排除 to。',
        ]),
        ('第 52 题　the ______ for clean water is constantly rising', '他写 use，答案 demand。', [
            '为什么：会“涨”的是需求，demand for 是固定搭配。use 不接 for，也不说“使用在涨”。',
            '记住：demand for、need for、call for。',
            '做法：名词和介词一起记，空格考名词时看后面的介词。',
        ]),
        ('第 54 题　have made clean water harder to ______ by', '他空着，答案 come。', [
            '为什么：come by 是“得到”，hard to come by 就是“难得到”。',
            '记住：come by 得到；get by 维持；stand by 支持；pass by 经过。',
            '做法：和第 49 题一样，先看后面的小词 by。不要空着。',
        ]),
        ('第 58 题　In ______, we can reuse water we have retained after washing our fruits and vegetables', '他空着，答案 fact。', [
            '为什么：句首 In 加一个空加逗号，是承接词。上句说修水龙头，这句再举一个例子，是进一步说明，用 In fact。',
            '记住：In fact 事实上；In addition（to）另外；In short 简而言之；In contrast 相比之下。',
            '做法：按这几个挨个试，后面带 to 的是 In addition。不要空着。',
        ]),
        ('第 60 题　we can ______ awareness about this matter amongst our family and friends', '他写 keep，答案 raise。', [
            '为什么：raise awareness 是固定搭配“提高意识”。这句说让家人朋友开始关注，是从无到有，不是 keep 保持。',
            '记住：raise awareness / funds / standards / a question。',
            '做法：按名词记动词，不用中文里说得通的动词硬凑。',
        ]),
    ]),
    ('阅读问答（丢 5 分）', [
        ('第 67 题　Why did Grandma accept the writer’s request “readily”?（1 分）', '他写 The writer was very enthusiastic. 标准答案 She sensed the writer’s enthusiasm to learn.', [
            '为什么：原文第 3 到 4 行 Sensing my enthusiasm to learn。采分点是 enthusiasm to learn 一个整体，他漏了 to learn，严格标准不给分。',
            '记住：一分题也要把原文那半句抄全，宁可多抄半句，不要少一个词。',
            '做法：引号词在哪一句，答案就在那一句或前后一句，改成第三人称抄下来。',
        ]),
        ('第 70c 题　“The writer had trouble looking for Grandma\'s recipe book.” True or False? 给一个理由。', '他写 False，理由“他看懂了但不知道怎么做”。标准答案 False，理由是他轻松就在抽屉角落找到了食谱。', [
            '为什么：判断对了，理由错了。理由必须回答“找食谱有没有困难”，原文第 19 到 20 行 locate her recipe book easily。他写的是后面做菜失败的事，答非所问。',
            '记住：判断和理由绑在一起，理由错整题 0 分。理由里必须出现题目问的关键词。',
            '做法：先在原文找到说这件事的那句划出来，再判断，理由用那句改写。',
        ]),
        ('第 71a 题　“the exciting bit”（第 5 行）指什么？', '他写 knowing how to cook，答案 cooking。', [
            '为什么：上一句是“我请奶奶教我做菜”，令人兴奋的部分就是“动手做菜”。knowing how to cook 是“会做菜”的状态，不是那个活动。',
            '记住：指代题答案在划线词前一句或后一句，直接抄原词。',
            '做法：不要自己换说法，一换就容易从动作变成状态。',
        ]),
        ('第 71c 题　“it”（第 27 行）指什么？', '他写 hot oil flying over my arm，答案 excruciating pain（剧痛）。', [
            '为什么：I ignored it，忍住的是疼，不是油。it 指离它最近的名词，前一句最后是 excruciating pain。',
            '记住：代词先找最近的名词，代进去读一遍通不通。',
            '做法：I ignored the pain 通顺；I ignored the hot oil 不通，油已经溅上了。',
        ]),
        ('第 75 题　State what the “enormous mistake”（第 40 行）was.', '他写“没听奶奶的话要小心，而且没经允许用厨房”，答案 He had neglected his safety。', [
            '为什么：第 39 到 40 行 More importantly, I had neglected my safety. 紧接着就是 enormous mistake，答案是前一句。“没经允许用厨房”原文没有，奶奶是把厨房留给他的，添了错的内容还倒扣。',
            '记住：引号词问“是什么”，答案在前后一句，常跟着 More importantly、In fact 这类提示词。',
            '做法：用原文的词答，不自己总结，不添原文没有的内容。',
        ]),
    ]),
]
