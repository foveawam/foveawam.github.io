"""Write dist/review-zh.html from dist/review.html.

Every English string on the page has a Chinese counterpart below. Each
replacement must match exactly once or more, so a changed English sentence
stops the script instead of leaving English text in the Chinese page.
Terminology follows the Chinese manuscript (manuscript_zh.tex and the
\\tablelang entries in tables/).
"""
import re
from pathlib import Path

DIST = Path(__file__).resolve().parent / "dist"
PI = "π<sub>0.5</sub>"

ABSTRACT_ZH = (
    "要操作运动中的物体，策略必须预测动作执行那一刻的场景，而用于预测的每一毫秒都会把那一刻推得更远。"
    "场景级预测可能耗费较多计算，聚焦目标的预测则可能遗漏影响接触的周围物体。"
    "我们的核心洞察是，策略需要预测的内容可以按角色解耦：只有决定接触的目标位姿需要毫米级精度，"
    "而周围环境只通过它们留下的间隙和传给目标的运动起作用。"
    "我们提出 FoveaWAM，一个按角色分配精度的原生 4D 世界—动作模型：它把目标过去与未来的运动建模为度量的 SE(3) 轨迹，"
    "把周围环境建模为稀疏 3D 流，一切静态内容则交给当前帧。"
    "这种紧凑的表征使 FoveaWAM 在一块 RTX 5090 上 15.1&nbsp;ms 即可输出动作，比视频世界—动作基线快约 10×，留给场景变化的时间很短。"
    "为了在每个策略自身的延迟下对其进行评测，我们提出动态操作基准 OnTimeBench：策略计算期间，场景持续运动。"
    "FoveaWAM 在 OnTimeBench 上的成功率达到 82.1%，比最强基线高 20.8 个百分点，并在 DOMINO 和真机任务上同样领先。"
)

PAIRS = [
    # Document head and navigation
    ('<html lang="en">', '<html lang="zh-CN">'),
    ('content="FoveaWAM learns a precise trajectory for the manipulation target and sparse 3D flow for the surrounding scene."',
     'content="FoveaWAM 为操作目标学习精确的 SE(3) 轨迹，为周围场景学习稀疏 3D 流。"'),
    ('<title>FoveaWAM: Role-Aware 4D World–Action Modeling for Dynamic Manipulation</title>',
     '<title>FoveaWAM：面向动态操作的角色感知 4D 世界—动作建模</title>'),
    ('>Skip to content<', '>跳到正文<'),
    ('aria-label="Main navigation"', 'aria-label="主导航"'),
    ('<a href="#real-demos">Real robot</a>', '<a href="#real-demos">真机实验</a>'),
    ('<a href="#method">Method</a>', '<a href="#method">方法</a>'),
    ('<a href="#results">Results</a>\n      </nav>',
     '<a href="#results">实验结果</a>\n        <a class="lang-switch" href="review.html" hreflang="en" lang="en">English</a>\n      </nav>'),
    ('<p class="author-note"><sup>†</sup>Corresponding authors</p>', '<p class="author-note"><sup>†</sup>通讯作者</p>'),
    ('<p>Please refer to our <!-- arXiv: replace with <a href="https://arxiv.org/abs/ID"> when the preprint is public --><span class="arxiv-pending" role="link" aria-disabled="true" title="arXiv link pending"><strong>paper</strong></span> for detailed discussions and the complete experimental results.</p>',
     '<p>详细讨论与完整实验结果请参阅我们的<!-- arXiv：预印本公开后替换为 <a href="https://arxiv.org/abs/ID"> --><span class="arxiv-pending" role="link" aria-disabled="true" title="arXiv 链接待发布"><strong>论文</strong></span>。</p>'),
    # Hero
    ('aria-label="FoveaWAM: Role-Aware 4D World–Action Modeling for Dynamic Manipulation"',
     'aria-label="FoveaWAM：面向动态操作的角色感知 4D 世界—动作建模"'),
    ('<span class="sr-only">: </span>', '<span class="sr-only">：</span>'),
    ('<span class="paper-subtitle">Role-Aware 4D World–Action Modeling for Dynamic Manipulation</span>',
     '<span class="paper-subtitle">面向动态操作的角色感知<br>4D 世界—动作建模</span>'),
    ('aria-label="Project resources"', 'aria-label="项目资源"'),
    ('aria-label="arXiv preprint, link pending"', 'aria-label="arXiv 预印本，链接待发布"'),
    ('title="arXiv preprint link pending"', 'title="arXiv 预印本链接待发布"'),
    ('aria-label="GitHub repositories, links pending"', 'aria-label="GitHub 仓库，链接待发布"'),
    ('aria-label="Model and data on Hugging Face"', 'aria-label="Hugging Face 上的模型与数据"'),
    ('>Model &amp; Data\n', '>模型与数据\n'),
    ('>FoveaWAM Model<', '>FoveaWAM 模型<'),
    ('>OnTimeBench Data<', '>OnTimeBench 数据<'),
    ('>Code\n', '>代码\n'),
    ('data-title="Figure 1. Role-aware prediction precision"', 'data-title="图 1. 按角色分配预测精度"'),
    ('aria-label="Enlarge Figure 1, role-aware prediction precision"', 'aria-label="放大图 1：按角色分配预测精度"'),
    ('alt="Target poses and sparse scene flow over a robot scene, with a staged grasp in the inset. The plot shows FoveaWAM at 82.1% success and 15.1 ms p95 time-to-action."',
     'alt="真机场景中的目标位姿与稀疏场景流，插图为抓取过程。右图显示 FoveaWAM 成功率 82.1%，p95 出动作时间 15.1 ms。"'),
    ('<strong>TL;DR</strong> Like the eye’s fovea, FoveaWAM predicts the manipulation target sharply and its surroundings coarsely, so it can act on a moving scene before its prediction goes stale.',
     '<strong>TL;DR</strong> 像人眼的中央凹一样，FoveaWAM 精细预测操作目标、粗略预测周围环境，因而能在预测过时之前，对持续运动的场景做出动作。'),
    ('title="Beijing Zhongguancun Academy"', 'title="北京中关村学院"'),
    ('alt="Beijing Zhongguancun Academy"', 'alt="北京中关村学院"'),
    ('title="Peking University"', 'title="北京大学"'),
    ('alt="Peking University"', 'alt="北京大学"'),
    ('title="Beijing Academy of Artificial Intelligence"', 'title="北京智源人工智能研究院"'),
    ('alt="Beijing Academy of Artificial Intelligence"', 'alt="北京智源人工智能研究院"'),
    # Abstract
    ('<h2 id="abstract-title">Abstract</h2>', '<h2 id="abstract-title">摘要</h2>'),
    # Real robot
    ('<h2 id="real-demos">Real-Robot Experiments</h2>', '<h2 id="real-demos">真机实验</h2>'),
    ('aria-live="polite">Real-robot trials</h3>', 'aria-live="polite">真机试验</h3>'),
    ('aria-label="Previous task"', 'aria-label="上一个任务"'),
    ('aria-label="Next task"', 'aria-label="下一个任务"'),
    ('aria-label="Close comparison"', 'aria-label="关闭对比"'),
    ('<span class="outcome success">Success</span>', '<span class="outcome success">成功</span>'),
    ('<span class="outcome failure">Failure</span>', '<span class="outcome failure">失败</span>'),
    ('aria-label="Playback of both videos"', 'aria-label="两段视频的播放控制"'),
    ('aria-label="Play both videos"', 'aria-label="同时播放两段视频"'),
    ('aria-label="Seek both videos by frame"', 'aria-label="逐帧定位两段视频"'),
    ('<!-- Fallback without JavaScript. Rates are Table 4 of the paper. -->',
     '<!-- 无 JavaScript 时的备用链接。成功率取自论文表 4。 -->'),
    ('>Conveyor grasp: <', '>传送带抓取：<'),
    ('>Moving box placement: <', '>移动盒放置：<'),
    ('>Turntable grasp: <', '>转盘抓取：<'),
    ('>Toy car grasp: <', '>玩具车抓取：<'),
    ('>Ball intercept: <', '>网球拦截：<'),
    ('>Ramp cart grasp: <', '>斜坡小车抓取：<'),
    ('>FoveaWAM success</a>', '>FoveaWAM 成功</a>'),
    (f'>{PI} failure</a>', f'>{PI} 失败</a>'),
    # Method
    ('<h2 id="method-title">Method</h2>', '<h2 id="method-title">方法</h2>'),
    ('<p>Only the target’s pose needs millimeter precision. FoveaWAM represents each part of the scene according to its role:</p>',
     '<p>只有目标位姿需要毫米级精度。FoveaWAM 按角色表示场景的各个部分：</p>'),
    ('<dt>Target</dt><dd>A metric SE(3) trajectory, read from a short pose history and predicted 400&nbsp;ms ahead.</dd>',
     '<dt>目标</dt><dd>度量的 SE(3) 轨迹：读取一小段位姿历史，并向前预测 400&nbsp;ms。</dd>'),
    ('<dt>Surroundings</dt><dd>Coarse sparse 3D flow, enough to capture the clearance they leave and the motion they impart.</dd>',
     '<dt>周围环境</dt><dd>粗粒度的稀疏 3D 流，足以刻画它们留下的间隙和传给目标的运动。</dd>'),
    ('<dt>Static scene</dt><dd>Taken from the current RGB-D frame.</dd>',
     '<dt>静态场景</dt><dd>直接取自当前 RGB-D 帧。</dd>'),
    ('data-title="Figure 2. Where prediction precision goes"', 'data-title="图 2. 预测精度用在哪里"'),
    ('aria-label="Enlarge Figure 2, three ways to predict a moving scene"', 'aria-label="放大图 2：预测运动场景的三种方式"'),
    ('alt="The same grasp under three prediction strategies. Full-scene prediction leaves the target pose implicit. Target-centric prediction follows the object. FoveaWAM predicts the target pose and the motion of nearby objects."',
     'alt="同一次抓取在三种预测方式下的对比：全场景预测中目标位姿是隐式的；聚焦目标的预测只跟踪物体；FoveaWAM 预测目标位姿和周围物体的运动。"'),
    ('data-title="Figure 3. FoveaWAM architecture"', 'data-title="图 3. FoveaWAM 架构"'),
    ('aria-label="Enlarge Figure 3, FoveaWAM architecture"', 'aria-label="放大图 3：FoveaWAM 架构"'),
    ('alt="RGB-D and pose histories enter the world stream. Separate heads predict scene flow and target poses during training. The attention mask and inference path show how the action stream reuses cached keys and values."',
     'alt="RGB-D 与位姿历史进入世界流；训练时由两个解码器分别预测场景流与目标位姿。注意力掩码与推理路径展示动作流如何复用缓存的键和值。"'),
    # OnTimeBench
    ('<p class="lead">Existing simulators pause the world while the policy computes. In OnTimeBench the scene keeps moving, so every policy is scored at its own measured latency.</p>',
     '<p class="lead">现有评测器在策略计算时暂停世界。OnTimeBench 中场景持续运动，每个策略都在自己实测的延迟下评测。</p>'),
    ('data-title="Figure 4. OnTimeBench"', 'data-title="图 4. OnTimeBench"'),
    ('aria-label="Enlarge Figure 4, OnTimeBench protocol and tasks"', 'aria-label="放大图 4：OnTimeBench 评测协议与任务"'),
    ('alt="The same 200 ms delay in two benchmarks. In DOMINO the ball stays where it was observed. In OnTimeBench it rolls 18 cm."',
     'alt="两个基准中同样 200 ms 的延迟：DOMINO 中小球停在观测到的位置，OnTimeBench 中小球滚动了 18 cm。"'),
    ('<figcaption>During a 200&nbsp;ms inference, a rolling ball travels 18&nbsp;cm.</figcaption>',
     '<figcaption>在 200&nbsp;ms 的推理期间，滚动的小球前进了 18&nbsp;cm。</figcaption>'),
    ('data-title="Figure 5. Native-latency execution"', 'data-title="图 5. 原生延迟下的执行"'),
    ('aria-label="Enlarge Figure 5, action execution timeline"', 'aria-label="放大图 5：动作执行时间线"'),
    ('alt="An observation starts a policy query. The previous action chunk runs until the next control boundary, when the new chunk takes over."',
     'alt="一次观测触发策略查询；上一个动作块持续执行到下一个控制边界，再由新动作块接管。"'),
    ('<figcaption>All policies share one control clock. A new chunk takes over at the next control boundary, and commands whose time has passed are skipped.</figcaption>',
     '<figcaption>所有策略共用一个控制时钟。新动作块在下一个控制边界接管，执行时刻已过的指令会被跳过。</figcaption>'),
    ('<h3 id="simulation-title">14 tasks in five families</h3>', '<h3 id="simulation-title">五个任务族，共 14 个任务</h3>'),
    ('<h3 id="sim-dialog-title">OnTimeBench task</h3>', '<h3 id="sim-dialog-title">OnTimeBench 任务</h3>'),
    ('rel="noopener">Open MP4</a>', 'rel="noopener">打开 MP4</a>'),
    ('aria-label="Close simulation video"', 'aria-label="关闭仿真视频"'),
    # Results
    ('<h2 id="results-title">Results</h2>', '<h2 id="results-title">实验结果</h2>'),
    ('<p class="lead">FoveaWAM has the highest success rate at native latency, with 150&nbsp;ms added, and with the world paused.</p>',
     '<p class="lead">无论是原生延迟、附加 150&nbsp;ms，还是暂停世界，FoveaWAM 的成功率都最高。</p>'),
    ('<caption class="sr-only">Table 1. Success rate on OnTimeBench, 1,400 held-out scenes, and p95 time-to-action on one RTX 5090.</caption>',
     '<caption class="sr-only">表 1. OnTimeBench 上 1,400 个留出场景的成功率，以及在一块 RTX 5090 上的 p95 出动作时间。</caption>'),
    ('<th scope="colgroup" colspan="3">Success rate (%) ↑</th><th scope="col" rowspan="2">p95 time-to-<br>action (ms) ↓</th>',
     '<th scope="colgroup" colspan="3">成功率 (%) ↑</th><th scope="col" rowspan="2">p95 出动作<br>时间 (ms) ↓</th>'),
    ('<tr><th scope="col">Native</th><th scope="col">+150&nbsp;ms</th><th scope="col">Paused</th></tr>',
     '<tr><th scope="col">原生</th><th scope="col">+150&nbsp;ms</th><th scope="col">暂停</th></tr>'),
    ('<th scope="col" rowspan="2">Method</th>', '<th scope="col" rowspan="2">方法</th>'),
    ('<th scope="row">FoveaWAM (ours)</th>', '<th scope="row">FoveaWAM（本文）</th>'),
    ('<figcaption>1,400 held-out scenes, 100 per task. +SE(3): the baseline also reads our target-pose history. off: OpenWAM-α without caching and compilation. <b>Best</b>, <u>second best</u>.</figcaption>',
     '<figcaption>1,400 个留出测试场景，每个任务 100 个。+SE(3)：基线额外读取我们的目标位姿历史。off：关闭缓存与编译的 OpenWAM-α。<b>粗体</b>为最佳，<u>下划线</u>为次佳。</figcaption>'),
    ('data-title="Figure 6a–b. Success under added delay"', 'data-title="图 6a–b. 附加延迟下的成功率"'),
    ('aria-label="Enlarge Figure 6a–b, success under added delay"', 'aria-label="放大图 6a–b：附加延迟下的成功率"'),
    ('alt="Success at 0, 50, 100 and 150 ms of extra delay. The left plot compares policies. The right compares π₀.₅ and DynamicWAM with and without SE(3) history. Error bars show 95% confidence intervals."',
     'alt="附加 0、50、100、150 ms 延迟时的成功率。左图比较各策略，右图比较 π₀.₅ 与 DynamicWAM 有无 SE(3) 历史。误差线为 95% 置信区间。"'),
    (f'<figcaption>FoveaWAM leads at every added delay. For {PI}, the same pose history hurts at +50 and +100&nbsp;ms: it describes the target at capture time and is stale by execution.</figcaption>',
     f'<figcaption>FoveaWAM 在每一档附加延迟下都领先。对 {PI} 而言，同样的位姿历史在 +50 与 +100&nbsp;ms 时反而有害：它描述的是采集时刻的目标，到执行时已经过时。</figcaption>'),
    ('data-title="Figure 6c. Paused and native rankings"', 'data-title="图 6c. 暂停与原生设置下的排名"'),
    ('aria-label="Enlarge Figure 6c, paused and native rankings"', 'aria-label="放大图 6c：暂停与原生设置下的排名"'),
    ('alt="Paused and native success rates for eleven configurations, with each method’s p95 time-to-action and change in rank. FoveaWAM ranks first in both settings."',
     'alt="11 种配置在暂停与原生设置下的成功率、p95 出动作时间与排名变化。FoveaWAM 在两种设置下都排第一。"'),
    ('<figcaption>Pausing the world hides the cost of latency and reorders 9 of the 11 methods. FoveaWAM ranks first either way.</figcaption>',
     '<figcaption>暂停世界掩盖了延迟的代价，11 个方法中有 9 个排名改变。两种设置下 FoveaWAM 都排第一。</figcaption>'),
    ('<h3 id="ablations">Ablations</h3>', '<h3 id="ablations">消融实验</h3>'),
    ('<p>Removing the target’s pose history costs 19.6 points. Without the SE(3) trajectory or the flow, rotation-sensitive tasks suffer most.</p>',
     '<p>去掉目标位姿历史会损失 19.6 个百分点。去掉 SE(3) 轨迹或场景流时，受影响最大的是旋转敏感任务。</p>'),
    ('<caption class="sr-only">Table 3. Ablations on OnTimeBench. FoveaWAM in percent, variants as change in points.</caption>',
     '<caption class="sr-only">表 3. OnTimeBench 上的消融实验。FoveaWAM 为成功率（%），各变体为变化量（百分点）。</caption>'),
    ('<th scope="colgroup" colspan="3">All tasks</th><th scope="colgroup" colspan="2">Native</th>',
     '<th scope="colgroup" colspan="3">全部任务</th><th scope="colgroup" colspan="2">任务组（原生）</th>'),
    ('<tr><th scope="col">Paused</th><th scope="col">Native</th><th scope="col">+150</th><th scope="col"><abbr title="Rotation-sensitive tasks">Rot.</abbr></th><th scope="col"><abbr title="Context-active tasks">Ctx.</abbr></th></tr>',
     '<tr><th scope="col">暂停</th><th scope="col">原生</th><th scope="col">+150</th><th scope="col"><abbr title="旋转敏感任务">旋转</abbr></th><th scope="col"><abbr title="环境活跃任务">环境</abbr></th></tr>'),
    ('<th scope="row">w/o pose history</th>', '<th scope="row">无目标历史</th>'),
    ('<th scope="row">uniform coarse flow</th>', '<th scope="row">统一粗粒度流</th>'),
    ('<th scope="row">uniform fine flow</th>', '<th scope="row">统一精细流</th>'),
    ('<th scope="row">w/o scene flow</th>', '<th scope="row">无场景流</th>'),
    ('<th scope="row">w/o future supervision</th>', '<th scope="row">无未来监督</th>'),
    ('<th scope="row">w/o appearance losses</th>', '<th scope="row">无外观辅助损失</th>'),
    ('<p>DOMINO pauses physics during inference, so low latency brings no advantage. FoveaWAM still leads on its 24 Franka tasks.</p>',
     '<p>DOMINO 在推理期间暂停物理仿真，低延迟不带来优势。在它的 24 个 Franka 任务上，FoveaWAM 依然领先。</p>'),
    ('<caption class="sr-only">Table 2. Success rate (%) and manipulation score on DOMINO.</caption>',
     '<caption class="sr-only">表 2. DOMINO 上的成功率（%）与操作得分。</caption>'),
    ('<th scope="colgroup" colspan="3">Success rate (%)</th><th scope="col" rowspan="2"><abbr title="Manipulation score">MS</abbr></th>',
     '<th scope="colgroup" colspan="3">成功率 (%)</th><th scope="col" rowspan="2"><abbr title="操作得分">MS</abbr></th>'),
    ('<tr><th scope="col">Intercept</th><th scope="col">Track</th><th scope="col">All</th></tr>',
     '<tr><th scope="col">拦截</th><th scope="col">跟踪</th><th scope="col">全部</th></tr>'),
    ('<h3 id="real-results">Real robot</h3>', '<h3 id="real-results">真机实验</h3>'),
    ('<p>FoveaWAM leads on all six tasks.</p>', '<p>FoveaWAM 在全部六个任务上领先。</p>'),
    ('<caption class="sr-only">Table 4. Real-robot success rate (%) over 20 trials per task.</caption>',
     '<caption class="sr-only">表 4. 真机成功率（%），每个任务 20 次试验。</caption>'),
    ('<th scope="colgroup" colspan="7">Success rate (%), 20 trials per task</th>',
     '<th scope="colgroup" colspan="7">成功率 (%)，每个任务 20 次试验</th>'),
    ('<tr><th scope="col">Conveyor</th><th scope="col">Box</th><th scope="col">Turntable</th><th scope="col">Toy car</th><th scope="col">Ball</th><th scope="col">Ramp cart</th><th scope="col">All</th></tr>',
     '<tr><th scope="col">传送带</th><th scope="col">移动盒</th><th scope="col">转盘</th><th scope="col">玩具车</th><th scope="col">网球</th><th scope="col">斜坡小车</th><th scope="col">总体</th></tr>'),
    # More details, citation, figure viewer
    ('<h2 id="details-title">More Details</h2>', '<h2 id="details-title">更多细节</h2>'),
    ('<span class="copy-label">Copy</span>', '<span class="copy-label">复制</span>'),
    ('aria-controls="figure-canvas">Actual size</button>', 'aria-controls="figure-canvas">原始尺寸</button>'),
    ('target="_blank">Original PNG</a>', 'target="_blank">原图 PNG</a>'),
    ('download hidden>Download figure PDF</a>', 'download hidden>下载图片 PDF</a>'),
    ('aria-label="Close enlarged view" id="close-figure" autofocus>Close</button>',
     'aria-label="关闭放大视图" id="close-figure" autofocus>关闭</button>'),
    ('aria-label="Enlarged artwork"', 'aria-label="放大的图片"'),
]


def main() -> None:
    html = (DIST / "review.html").read_text(encoding="utf-8")
    for english, chinese in PAIRS:
        if english not in html:
            raise SystemExit(f"Not found in review.html: {english[:80]}")
        html = html.replace(english, chinese)
    abstract = re.compile(r'(<h2 id="abstract-title">摘要</h2>\s*<p>)(.*?)(</p>)', re.S)
    html, count = abstract.subn(lambda m: m.group(1) + ABSTRACT_ZH + m.group(3), html)
    if count != 1:
        raise SystemExit("Abstract paragraph not found")
    (DIST / "review-zh.html").write_text(html, encoding="utf-8")
    print("wrote review-zh.html")


if __name__ == "__main__":
    main()
