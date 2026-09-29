/**
 * Custom Reporter for Playwright
 * @author Santhi @SDET-QA
 * @version 1.0.0
 * @description Custom HTML Reporter for Playwright Test Automation Framework
 */

import {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface StepData {
  title: string;
  category: string;
  duration: number;
  status: 'passed' | 'failed' | 'skipped';
  screenshot?: string;
  error?: string;
  stackTrace?: string;
  startTime: string;
  consoleLogs?: string[];
  stepIndex?: number;
  videoStartTime?: number;
  videoEndTime?: number;
}

interface TestData {
  id: string;
  title: string;
  fullTitle: string;
  file: string;
  describePath: string[];
  location: string;
  duration: number;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  retry: number;
  screenshots: { name: string; path: string }[];
  steps: StepData[];
  video?: string;
  trace?: string;
  error?: string;
  errorStack?: string;
  tags: string[];
}

interface FileGroup {
  file: string;
  describes: Map<string, TestData[]>;
  stats: { passed: number; failed: number; skipped: number; total: number };
}

interface SuiteStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
}

/* ========== DASHBOARD / CHART DATA INTERFACES ========== */

interface StatusCounts {
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  broken: number;     // always 0 today - TestData has no 'broken' status yet
  unknown: number;    // always 0 today - reserved for future/unmapped statuses
}

interface SeverityStatusCounts {
  passed: number;
  failed: number;
  skipped: number;
  broken: number;
}

interface SeverityCounts {
  blocker: SeverityStatusCounts;
  critical: SeverityStatusCounts;
  normal: SeverityStatusCounts;
  minor: SeverityStatusCounts;
  trivial: SeverityStatusCounts;
}

interface DurationBucket {
  label: string;
  count: number;
}

interface DurationTrendPoint {
  order: number;
  duration: number; // seconds
  title: string;
}

interface ChartData {
  status: StatusCounts;
  passRate: number;
  severity: SeverityCounts;
  durationBuckets: DurationBucket[];
  durationTrend: DurationTrendPoint[];
}

type SeverityKey = keyof SeverityCounts;

class CustomReporter implements Reporter {
  private testResults: TestData[] = [];
  private fileGroups: Map<string, FileGroup> = new Map();
  private suiteStats: SuiteStats = { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 };
  private config!: FullConfig;
  private startTime: Date = new Date();
  private endTime: Date = new Date();
  private outputFile: string = 'custom-report/index.html';
  private runId: string = '';
  private testStepsMap: Map<string, StepData[]> = new Map();
  private testStartTimeMap: Map<string, number> = new Map();
  private testStepCounterMap: Map<string, number> = new Map();
  private testCounter: number = 0;
  private runningTests: Map<string, TestData> = new Map();
  private completedTestIds: Set<string> = new Set();

  onBegin(config: FullConfig, suite: Suite): void {
    const now = new Date();
    this.runId = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.outputFile = `custom-report/report_${this.runId}.html`;
    this.config = config;
    this.startTime = new Date();
    const totalTests = suite.allTests().length;

    console.log('\n=============================================================================');
    console.log('│                    🎭 PLAYWRIGHT AUTOMATION - Open Cart - REPORT             │');
    console.log('=============================================================================');
    console.log(`│ 📅 Started: ${this.startTime.toLocaleString().padEnd(47)} │`);
    console.log(`│ 📊 Total Tests: ${String(totalTests).padEnd(44)} │`);
    console.log(`│ 💻 Environment: ${(process.env.TEST_ENV || 'QA').padEnd(44)} │`);
    console.log('=============================================================================');

    this.initializeLiveReport();
  }

  private initializeLiveReport(): void {
    const reportDir = path.dirname(this.outputFile);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    this.updateReportRealTime();
    console.log(`📝 Real-time report: ${this.outputFile}`);
  }

  onTestBegin(test: TestCase): void {
    this.testStepsMap.set(test.id, []);
    this.testStartTimeMap.set(test.id, Date.now());
    this.testStepCounterMap.set(test.id, 0);
    this.testCounter++;

    const testFile = test.location.file.split('/').pop() || '';
    console.log(`\n▶️ STARTING: ${test.title}`);
    console.log(`  📁 File: ${testFile}`);
    console.log(`  📌 Suite: ${test.parent.title} ──────────────────────────────────────────────`);

    const describePath: string[] = [];
    let parent: { title: string; parent?: unknown } | undefined = test.parent;
    while (parent && parent.title) {
      describePath.unshift(parent.title);
      parent = parent.parent as { title: string; parent?: unknown } | undefined;
    }

    this.runningTests.set(test.id, {
      id: `running-${test.id}`,
      title: test.title,
      fullTitle: [...describePath, test.title].join(' > '),
      file: test.location.file,
      describePath: describePath,
      location: `${test.location.file}:${test.location.line}`,
      duration: 0,
      status: 'passed',
      retry: test.results.length,
      screenshots: [],
      steps: [],
      tags: test.tags || []
    });
  }

  onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
    const counter = (this.testStepCounterMap.get(test.id) || 0) + 1;
    this.testStepCounterMap.set(test.id, counter);

    // Filter out internal hooks/steps if only raw action reporting is preferred
    if (step.category === 'test.step') {
      console.log(`  🔹 Step: ${step.title}`);
    }
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    const steps = this.testStepsMap.get(test.id) || [];
    
    const stepData: StepData = {
      title: step.title,
      category: step.category,
      duration: step.duration,
      status: step.error ? 'failed' : 'passed',
      startTime: step.startTime.toISOString(),
      error: step.error?.message,
      stackTrace: step.error?.stack,
      stepIndex: this.testStepCounterMap.get(test.id)
    };

    steps.push(stepData);
    this.testStepsMap.set(test.id, steps);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const runningTest = this.runningTests.get(test.id);
    if (!runningTest) return;

    // Attach step structures and update properties
    runningTest.steps = this.testStepsMap.get(test.id) || [];
    runningTest.duration = result.duration;
    runningTest.status = result.status as 'passed' | 'failed' | 'skipped' | 'timedOut';
    
    if (result.error) {
      runningTest.error = result.error.message;
      runningTest.errorStack = result.error.stack;
    }

    // Process attachments (Screenshots, Video, Traces)
    for (const attachment of result.attachments) {
      if (attachment.name === 'screenshot' && attachment.path) {
        runningTest.screenshots.push({ name: 'Screenshot', path: attachment.path });
      } else if (attachment.name === 'video' && attachment.path) {
        runningTest.video = attachment.path;
      } else if (attachment.name === 'trace' && attachment.path) {
        runningTest.trace = attachment.path;
      }
    }

    this.testResults.push(runningTest);
    this.completedTestIds.add(test.id);
    this.runningTests.delete(test.id);

    // Grouping by File Paths
    const relativeFile = path.relative(process.cwd(), test.location.file);
    if (!this.fileGroups.has(relativeFile)) {
      this.fileGroups.set(relativeFile, {
        file: relativeFile,
        describes: new Map<string, TestData[]>(),
        stats: { passed: 0, failed: 0, skipped: 0, total: 0 }
      });
    }

    const fileGroup = this.fileGroups.get(relativeFile)!;
    const describeKey = runningTest.describePath.join(' > ') || 'Root';
    
    if (!fileGroup.describes.has(describeKey)) {
      fileGroup.describes.set(describeKey, []);
    }
    fileGroup.describes.get(describeKey)!.push(runningTest);

    // Increment Status Statistics
    fileGroup.stats.total++;
    if (runningTest.status === 'passed') fileGroup.stats.passed++;
    else if (runningTest.status === 'failed' || runningTest.status === 'timedOut') fileGroup.stats.failed++;
    else if (runningTest.status === 'skipped') fileGroup.stats.skipped++;

    // Print step console summaries
    const statusIcon = runningTest.status === 'passed' ? '✅' : runningTest.status === 'failed' ? '❌' : '⚠️';
    console.log(`\n${statusIcon} FINISHED: ${runningTest.title} (${(result.duration / 1000).toFixed(2)}s)`);

    this.updateReportRealTime();
  }

  onEnd(result: FullResult): void {
    this.endTime = new Date();
    
    // Process final metric structures
    this.suiteStats.total = this.testResults.length;
    this.suiteStats.passed = this.testResults.filter(t => t.status === 'passed').length;
    this.suiteStats.failed = this.testResults.filter(t => t.status === 'failed' || t.status === 'timedOut').length;
    this.suiteStats.skipped = this.testResults.filter(t => t.status === 'skipped').length;
    this.suiteStats.flaky = this.testResults.filter(t => t.retry > 0 && t.status === 'passed').length;

    console.log('\n=============================================================================');
    console.log(`│ 🏁 Run Finished: ${result.status.toUpperCase().padEnd(56)} │`);
    console.log(`│ 📈 Passed: ${String(this.suiteStats.passed).padEnd(12)} Failed: ${String(this.suiteStats.failed).padEnd(12)} Skipped: ${String(this.suiteStats.skipped).padEnd(12)} │`);
    console.log('=============================================================================');

    this.updateReportRealTime();
  }

  private updateReportRealTime(): void {
    const total = Math.max(this.suiteStats.total, 1);
    const passRate = Math.round((this.suiteStats.passed / total) * 100);
    const duration = this.testResults.reduce((sum, test) => sum + test.duration, 0);
    const statusCounts = {
      passed: this.suiteStats.passed,
      failed: this.suiteStats.failed,
      skipped: this.suiteStats.skipped,
      timedOut: this.testResults.filter(test => test.status === 'timedOut').length,
    };
    const maxDuration = Math.max(...this.testResults.map(test => test.duration), 1);
    const maxSteps = Math.max(...this.testResults.map(test => test.steps.length), 1);

    const rows = this.testResults.map((test, index) => {
      const status = test.status === 'timedOut' ? 'failed' : test.status;
      const steps = test.steps.map((step, stepIndex) => `
        <li class="step ${step.status === 'failed' ? 'step-failed' : ''}">
          <span class="step-icon">${step.status === 'failed' ? '!' : '✓'}</span>
          <span class="step-title">${this.escapeHtml(step.title)}</span>
          <span class="step-meta">${step.duration} ms</span>
          ${step.error ? `<pre>${this.escapeHtml(step.error)}</pre>` : ''}
        </li>`).join('');
      const tags = test.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('');
      return `
        <tr class="test-row" data-status="${status}" data-search="${this.escapeHtml(`${test.title} ${test.file} ${test.tags.join(' ')}`.toLowerCase())}">
          <td>${index + 1}</td>
          <td><button class="test-name" onclick="toggleDetails('details-${index}')">${this.escapeHtml(test.title)}</button><div class="tags">${tags}</div></td>
          <td class="muted">${this.escapeHtml(path.basename(test.file))}</td>
          <td>${(test.duration / 1000).toFixed(1)}s</td>
          <td><span class="status status-${status}">${status.toUpperCase()}</span></td>
        </tr>
        <tr id="details-${index}" class="details-row" hidden>
          <td colspan="5">
            <div class="details-head"><strong>${this.escapeHtml(test.fullTitle)}</strong><span>${this.escapeHtml(test.location)}</span></div>
            ${test.error ? `<div class="error">${this.escapeHtml(test.error)}</div>` : ''}
            <ol class="steps">${steps || '<li class="muted">No recorded Playwright steps.</li>'}</ol>
          </td>
        </tr>`;
    }).join('');

    const durationBars = this.testResults.map(test => {
      const height = Math.max(8, Math.round((test.duration / maxDuration) * 145));
      return `<div class="bar-column" title="${this.escapeHtml(test.title)}: ${(test.duration / 1000).toFixed(1)}s"><div class="bar" style="height:${height}px"></div><span>${test.steps.length}</span></div>`;
    }).join('');
    const stepBars = this.testResults.map(test => {
      const height = Math.max(8, Math.round((test.steps.length / maxSteps) * 145));
      return `<div class="bar-column" title="${this.escapeHtml(test.title)}: ${test.steps.length} steps"><div class="bar bar-purple" style="height:${height}px"></div><span>${test.steps.length}</span></div>`;
    }).join('');
    const failedOffset = total ? (statusCounts.passed / total) * 360 : 0;
    const skippedOffset = total ? ((statusCounts.passed + statusCounts.failed) / total) * 360 : 0;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Playwright Automation Test Report</title>
  <style>
    :root { --ink:#17202a; --muted:#718096; --line:#e7edf2; --green:#19a974; --red:#ef5350; --blue:#3b9ee8; --purple:#8b6bd9; --bg:#f5f8fa; }
    * { box-sizing:border-box; } body { margin:0; color:var(--ink); background:var(--bg); font:14px/1.45 "Segoe UI", sans-serif; }
    header { padding:34px max(24px, calc((100% - 1180px) / 2)); color:white; background:linear-gradient(120deg,#078f78,#13a88c); }
    header h1 { margin:0; font-size:27px; } header p { margin:5px 0 0; opacity:.85; }
    main { max-width:1180px; margin:0 auto; padding:22px 24px 50px; } .cards { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; }
    .card,.panel,.toolbar,.meta { background:white; border:1px solid var(--line); border-radius:8px; box-shadow:0 2px 8px #19324b0b; }
    .card { padding:17px; border-left:3px solid var(--green); } .card.failed { border-left-color:var(--red); } .card.skipped { border-left-color:#9aa6b2; }
    .card strong { display:block; font-size:25px; } .card span,.muted { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
    .meta { display:flex; gap:22px; margin:16px 0; padding:12px 15px; color:var(--muted); font-size:12px; } .meta b { color:var(--ink); }
    .charts { display:grid; grid-template-columns:1fr 1fr; gap:14px; } .panel { padding:15px; min-height:230px; } .panel h3 { margin:0 0 12px; font-size:15px; }
    .chart-row { display:flex; align-items:center; justify-content:center; gap:30px; height:175px; } .donut { width:145px; height:145px; border-radius:50%; background:conic-gradient(var(--green) 0 ${passRate}%, var(--red) ${passRate}% ${Math.min(100, passRate + (statusCounts.failed / total) * 100)}%, #aab4bd ${Math.min(100, passRate + (statusCounts.failed / total) * 100)}%); position:relative; }
    .donut:after { content:""; position:absolute; inset:28px; background:white; border-radius:50%; } .donut-label { position:absolute; z-index:1; inset:0; display:grid; place-content:center; text-align:center; font-size:23px; font-weight:700; }
    .legend { display:grid; gap:6px; color:var(--muted); font-size:12px; } .dot { display:inline-block; width:12px; height:8px; margin-right:6px; } .green{background:var(--green)} .red{background:var(--red)} .gray{background:#aab4bd} .yellow{background:#f6c344}
    .bars { height:175px; display:flex; align-items:end; justify-content:center; gap:14px; border-bottom:1px solid var(--line); padding:0 12px; } .bar-column { display:flex; flex-direction:column; align-items:center; justify-content:end; height:165px; min-width:24px; color:var(--muted); font-size:10px; } .bar { width:22px; background:var(--blue); border-radius:3px 3px 0 0; } .bar-purple{background:var(--purple)}
    .toolbar { display:flex; gap:14px; align-items:center; margin:17px 0 10px; padding:12px 15px; } .toolbar input { flex:1; border:1px solid var(--line); border-radius:5px; padding:8px 10px; } .filter { cursor:pointer; }
    table { width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; background:white; border:1px solid var(--line); border-radius:8px; } th,td { padding:12px 10px; text-align:left; border-bottom:1px solid var(--line); } th { background:#f7fafc; color:var(--muted); font-size:10px; text-transform:uppercase; } tr:last-child td { border-bottom:0; }
    .test-name { border:0; background:none; color:#168b78; cursor:pointer; font-weight:600; text-align:left; padding:0; } .tags { margin-top:5px; } .tag { display:inline-block; margin:0 4px 2px 0; padding:2px 6px; color:#168b78; background:#e5f7f2; border-radius:10px; font-size:10px; }
    .status { display:inline-block; padding:4px 9px; border-radius:12px; color:white; font-size:10px; font-weight:700; } .status-passed{background:var(--green)} .status-failed,.status-timedOut{background:var(--red)} .status-skipped{background:#9aa6b2}
    .details-row td { background:#fbfdfe; padding:18px 28px; } .details-head { display:flex; justify-content:space-between; gap:10px; margin-bottom:12px; } .details-head span { color:var(--muted); font-size:11px; } .steps { margin:0; padding-left:27px; } .step { padding:7px 0 7px 4px; } .step-icon { display:inline-grid; place-items:center; width:18px; height:18px; border-radius:50%; margin-right:7px; color:var(--green); background:#e5f7f2; font-size:11px; } .step-failed .step-icon { color:var(--red); background:#ffe7e7; } .step-meta { float:right; color:var(--muted); font-size:11px; } .step pre,.error { padding:9px; overflow:auto; color:#a72525; background:#fff0f0; border-radius:4px; white-space:pre-wrap; } .error { margin-bottom:12px; }
    @media(max-width:800px){ .cards{grid-template-columns:repeat(2,1fr)} .charts{grid-template-columns:1fr} .meta{flex-wrap:wrap} main{padding:15px 10px} th:nth-child(3),td:nth-child(3){display:none} }
  </style>
</head>
<body>
  <header><h1>🎭 Playwright Automation Test Report</h1><p>Execution insights for every test run</p></header>
  <main>
    <section class="cards"><div class="card"><strong>${this.suiteStats.total}</strong><span>Total Tests</span></div><div class="card"><strong>${this.suiteStats.passed}</strong><span>Passed</span></div><div class="card failed"><strong>${this.suiteStats.failed}</strong><span>Failed</span></div><div class="card skipped"><strong>${this.suiteStats.skipped}</strong><span>Skipped</span></div><div class="card"><strong>${passRate}.0%</strong><span>Pass Rate</span></div><div class="card"><strong>${(duration / 1000).toFixed(1)}s</strong><span>Duration</span></div></section>
    <section class="meta"><span>Environment <b>${this.escapeHtml(process.env.TEST_ENV || 'QA')}</b></span><span>Browser <b>Chromium</b></span><span>Workers <b>${this.config.workers}</b></span><span>Started <b>${this.startTime.toLocaleString()}</b></span></section>
    <section class="charts"><div class="panel"><h3>Status</h3><div class="chart-row"><div class="donut"><div class="donut-label">${passRate}%<small>Pass Rate</small></div></div><div class="legend"><span><i class="dot green"></i>Passed ${statusCounts.passed}</span><span><i class="dot red"></i>Failed ${statusCounts.failed}</span><span><i class="dot gray"></i>Skipped ${statusCounts.skipped}</span><span><i class="dot yellow"></i>Timed out ${statusCounts.timedOut}</span></div></div></div><div class="panel"><h3>Duration Trend</h3><div class="bars">${durationBars || '<span class="muted">No completed tests yet</span>'}</div></div><div class="panel"><h3>Test Steps</h3><div class="bars">${stepBars || '<span class="muted">No steps captured yet</span>'}</div></div><div class="panel"><h3>Execution Summary</h3><div class="legend" style="padding:25px"><span><i class="dot green"></i>Completed: ${this.testResults.filter(test => test.status === 'passed').length}</span><span><i class="dot red"></i>Needs attention: ${this.suiteStats.failed}</span><span>Total recorded steps: ${this.testResults.reduce((sum, test) => sum + test.steps.length, 0)}</span></div></div></section>
    <div class="toolbar"><strong>Tests</strong><label class="filter"><input type="checkbox" checked onchange="filterStatus('all')"> All</label><label class="filter"><input type="checkbox" onchange="filterStatus('passed')"> Passed</label><label class="filter"><input type="checkbox" onchange="filterStatus('failed')"> Failed</label><input id="search" placeholder="Filter tests..." oninput="filterTests()"></div>
    <table><thead><tr><th>S.No</th><th>Test Name</th><th>File</th><th>Duration</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
  </main>
  <script>
    function toggleDetails(id){const row=document.getElementById(id);row.hidden=!row.hidden;}
    function filterStatus(status){document.querySelectorAll('.test-row').forEach(row=>{row.style.display=status==='all'||row.dataset.status===status?'':'none';});}
    function filterTests(){const query=document.getElementById('search').value.toLowerCase();document.querySelectorAll('.test-row').forEach(row=>{row.style.display=row.dataset.search.includes(query)?'':'none';});}
  </script>
</body></html>`;

    fs.writeFileSync(this.outputFile, html, 'utf8');
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character] ?? character);
  }
}


export default CustomReporter;
