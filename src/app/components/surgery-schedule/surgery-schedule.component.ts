import { Component, OnInit } from '@angular/core';
import { SurgerySchedule, FilterCriteria } from '../../models/surgery-schedule.model';
import { SurgeryScheduleService } from '../../services/surgery-schedule.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { generateMockApplications } from '../../data/mock-data';

@Component({
  selector: 'app-surgery-schedule',
  templateUrl: './surgery-schedule.component.html',
  styleUrls: ['./surgery-schedule.component.scss']
})
export class SurgeryScheduleComponent implements OnInit {
  // 数据
  schedules: SurgerySchedule[] = [];
  filteredSchedules: SurgerySchedule[] = [];
  loading = false;

  // 视图切换
  currentView: 'calendar' | 'table' = 'table';

  // 列显示控制
  showDiagnosis = false;

  // 表格勾选
  setOfCheckedId = new Set<string>();
  checked = false;
  indeterminate = false;

  // 表单
  formVisible = false;
  selectedSchedule: SurgerySchedule | null = null;
  prefilledFormData: { start?: Date; end?: Date } | null = null;

  // 筛选
  currentFilters: FilterCriteria = {};

  // 表格配置
  tablePageIndex = 1;
  tablePageSize = 10;

  // 统计概览（用于顶部“饱满度”）
  get totalCount(): number {
    return this.filteredSchedules.length;
  }
  get urgentCount(): number {
    return this.filteredSchedules.filter(s => s.urgency === 'urgent').length;
  }
  get selectedCount(): number {
    return this.setOfCheckedId.size;
  }
  get statusCounts(): Record<string, number> {
    const counts: Record<string, number> = {
      unscheduled: 0,
      scheduled: 0,
      'in-progress': 0,
      completed: 0,
      cancelled: 0
    };
    for (const s of this.filteredSchedules) {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    }
    return counts;
  }

  getRowClass(schedule: SurgerySchedule, _rowIndex: number): string[] {
    const status = schedule.status || 'unscheduled';
    const classes = [`row-status-${status}`];

    if (schedule.urgency === 'urgent') {
      classes.push('row-urgent');
    }

    if (this.setOfCheckedId.has(schedule.id)) {
      classes.push('row-selected');
    }

    return classes;
  }

  constructor(
    private scheduleService: SurgeryScheduleService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadSchedules();
  }

  /**
   * 加载排班数据
   */
  loadSchedules(): void {
    this.loading = true;
    this.scheduleService.getSchedules(this.currentFilters).subscribe({
      next: (schedules) => {
        this.schedules = schedules;
        this.filteredSchedules = schedules;
        this.syncCheckedState();
        this.loading = false;
      },
      error: (error) => {
        this.message.error('加载数据失败：' + error.message);
        this.loading = false;
      }
    });
  }

  refresh(): void {
    this.loadSchedules();
  }

  fetchApplications(): void {
    // 模拟：从第三方拉取一批“手术申请”
    const apps = generateMockApplications(20);
    const existingInpatientNos = new Set(
      this.schedules.map(s => s.inpatientNo).filter(Boolean) as string[]
    );
    const deduped = apps.filter(a => !a.inpatientNo || !existingInpatientNos.has(a.inpatientNo));

    this.scheduleService.appendSchedules(deduped);
    this.message.success(`已获取申请 ${deduped.length} 条`);
  }

  /**
   * 处理筛选变化
   */
  handleFilterChange(filters: FilterCriteria): void {
    this.currentFilters = filters;
    this.loadSchedules();
  }

  /**
   * 重置筛选
   */
  handleFilterReset(): void {
    this.currentFilters = {};
    this.loadSchedules();
  }

  /**
   * 显示新建表单
   */
  showCreateForm(): void {
    this.selectedSchedule = null;
    this.prefilledFormData = null;
    this.formVisible = true;
  }

  /**
   * 日历事件点击 - 显示编辑表单
   */
  handleEventClick(schedule: SurgerySchedule): void {
    this.selectedSchedule = schedule;
    this.prefilledFormData = null;
    this.formVisible = true;
  }


  /**
   * 日历日期选择 - 显示创建表单（预填充时间）
   */
  handleDateSelect(dateInfo: { start: Date; end: Date }): void {
    this.selectedSchedule = null;
    this.prefilledFormData = {
      start: dateInfo.start,
      end: dateInfo.end
    };
    this.formVisible = true;
  }

  /**
   * 处理事件拖拽
   */
  handleEventDrop(dropInfo: { schedule: SurgerySchedule; newStart: Date; newEnd: Date }): void {
    const updatedSchedule: Partial<SurgerySchedule> = {
      startTime: dropInfo.newStart,
      endTime: dropInfo.newEnd
    };

    // 检查冲突
    this.scheduleService.checkTimeConflict(
      { ...dropInfo.schedule, ...updatedSchedule } as SurgerySchedule,
      dropInfo.schedule.id
    ).subscribe(result => {
      if (result.hasConflict) {
        this.message.warning(result.message || '存在时间冲突，无法调整');
        this.loadSchedules(); // 刷新以恢复原位置
        return;
      }

      // 更新排班
      this.scheduleService.updateSchedule(dropInfo.schedule.id, updatedSchedule).subscribe({
        next: () => {
          this.message.success('时间调整成功');
          this.loadSchedules();
        },
        error: (error) => {
          this.message.error('更新失败：' + error.message);
          this.loadSchedules();
        }
      });
    });
  }

  /**
   * 表单提交成功
   */
  handleFormSubmit(): void {
    this.formVisible = false;
    this.loadSchedules();
  }

  /**
   * 表单取消
   */
  handleFormCancel(): void {
    this.formVisible = false;
    this.selectedSchedule = null;
    this.prefilledFormData = null;
  }

  /**
   * 切换视图
   */
  switchView(view: 'calendar' | 'table'): void {
    this.currentView = view;
  }

  /**
   * 打印当前列表（筛选后的）
   */
  printList(): void {
    const title = `手术排班列表（共 ${this.filteredSchedules.length} 条）`;
    const html = this.buildPrintHtml(title, this.filteredSchedules);
    const win = window.open('', '_blank');
    if (!win) {
      this.message.warning('浏览器拦截了弹窗，请允许弹窗后重试');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  private buildPrintHtml(title: string, rows: SurgerySchedule[]): string {
    const escape = (s: unknown) =>
      String(s ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    const toText = (s: SurgerySchedule) => ({
      urgency: s.urgency === 'urgent' ? '急' : s.urgency === 'elective' ? '择' : '-',
      patient: s.inpatientNo ? `${s.patientName}（${s.inpatientNo}）` : s.patientName,
      deptBed: `${s.dept ?? '-'} ${s.ward ?? ''}${s.bedNo ? '/' + s.bedNo + '床' : ''}`.trim(),
      diagnosis: s.diagnosis ?? '-',
      surgery: s.surgeryType ?? '-',
      team: `主刀:${s.doctorName ?? '-'}  助理:${(s.assistantDoctors ?? []).join(', ') || '-'}`,
      room: s.operatingRoom ?? '-',
      time: this.formatTimeRange(s.startTime, s.endTime),
      status: this.getStatusText(s.status)
    });

    const head = `
      <tr>
        <th>序号</th>
        <th>急/择</th>
        <th>患者</th>
        <th>科室/床位</th>
        <th>诊断</th>
        <th>手术</th>
        <th>团队</th>
        <th>手术间</th>
        <th>预约时间段</th>
        <th>状态</th>
      </tr>
    `;

    const body = rows
      .map((s, idx) => {
        const t = toText(s);
        return `
          <tr>
            <td>${idx + 1}</td>
            <td>${escape(t.urgency)}</td>
            <td>${escape(t.patient)}</td>
            <td>${escape(t.deptBed)}</td>
            <td>${escape(t.diagnosis)}</td>
            <td>${escape(t.surgery)}</td>
            <td>${escape(t.team)}</td>
            <td>${escape(t.room)}</td>
            <td>${escape(t.time)}</td>
            <td>${escape(t.status)}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escape(title)}</title>
          <style>
            body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif; padding: 18px; }
            h1 { font-size: 16px; margin: 0 0 12px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d9d9d9; padding: 6px 8px; vertical-align: top; }
            th { background: #fafafa; text-align: left; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${escape(title)}</h1>
          <table>
            <thead>${head}</thead>
            <tbody>${body}</tbody>
          </table>
        </body>
      </html>
    `;
  }

  onAllChecked(checked: boolean): void {
    this.filteredSchedules.forEach(({ id }) => this.updateCheckedSet(id, checked));
    this.refreshCheckedStatus();
  }

  onItemChecked(id: string, checked: boolean): void {
    this.updateCheckedSet(id, checked);
    this.refreshCheckedStatus();
  }

  private updateCheckedSet(id: string, checked: boolean): void {
    if (checked) {
      this.setOfCheckedId.add(id);
    } else {
      this.setOfCheckedId.delete(id);
    }
  }

  private refreshCheckedStatus(): void {
    const data = this.filteredSchedules;
    const allChecked = data.length > 0 && data.every(item => this.setOfCheckedId.has(item.id));
    const allUnChecked = data.every(item => !this.setOfCheckedId.has(item.id));
    this.checked = allChecked;
    this.indeterminate = !allChecked && !allUnChecked;
  }

  private syncCheckedState(): void {
    // 移除当前过滤数据中不存在的 id
    const validIds = new Set(this.filteredSchedules.map(s => s.id));
    Array.from(this.setOfCheckedId).forEach(id => {
      if (!validIds.has(id)) {
        this.setOfCheckedId.delete(id);
      }
    });
    this.refreshCheckedStatus();
  }

  getRowIndex(schedule: SurgerySchedule): number {
    const idx = this.filteredSchedules.findIndex(s => s.id === schedule.id);
    return idx >= 0 ? idx + 1 : 0;
  }

  formatTimeRange(start: Date, end: Date): string {
    if (!start || !end) return '-';
    return `${this.formatDateTime(start)} ~ ${this.formatDateTime(end)}`;
  }

  /**
   * 获取状态标签
   */
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'unscheduled': '未安排',
      'scheduled': '已安排',
      'in-progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  }

  /**
   * 获取状态标签颜色
   */
  getStatusTagColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'unscheduled': 'orange',
      'scheduled': 'blue',
      'in-progress': 'green',
      'completed': 'default',
      'cancelled': 'red'
    };
    return colorMap[status] || 'default';
  }

  /**
   * 格式化日期时间
   */
  formatDateTime(date: Date): string {
    if (!date) return '-';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
}
