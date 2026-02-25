import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FilterCriteria, STATUS_OPTIONS, ScheduleStatus, UrgencyLevel } from '../../models/surgery-schedule.model';
import { SurgeryScheduleService } from '../../services/surgery-schedule.service';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-schedule-filter',
  templateUrl: './schedule-filter.component.html',
  styleUrls: ['./schedule-filter.component.scss']
})
export class ScheduleFilterComponent implements OnInit {
  @Output() filterChange = new EventEmitter<FilterCriteria>();
  @Output() reset = new EventEmitter<void>();

  filterForm!: FormGroup;
  
  // 选项列表
  statusOptions = STATUS_OPTIONS;
  urgencyOptions: Array<{ label: string; value: UrgencyLevel }> = [
    { label: '急', value: 'urgent' },
    { label: '择', value: 'elective' }
  ];
  statusSegmentOptions: Array<{ label: string; value: 'all' | ScheduleStatus }> = [
    { label: '全部', value: 'all' },
    { label: '未安排', value: 'unscheduled' },
    { label: '已安排', value: 'scheduled' },
    { label: '进行中', value: 'in-progress' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' }
  ];
  doctorOptions: string[] = [];
  operatingRoomOptions: string[] = [];
  surgeryTypeOptions: string[] = [];

  // 控制折叠
  isCollapsed = false;

  constructor(
    private fb: FormBuilder,
    private scheduleService: SurgeryScheduleService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadOptions();
    this.subscribeToFormChanges();
  }

  /**
   * 初始化表单
   */
  private initForm(): void {
    this.filterForm = this.fb.group({
      dateRange: [null],
      keyword: [null],
      urgency: [null],
      statusSegment: ['all'],
      doctorName: [null],
      operatingRoom: [null],
      status: [null],
      surgeryType: [null]
    });
  }

  /**
   * 加载选项列表
   */
  private loadOptions(): void {
    this.scheduleService.getDoctors().subscribe(doctors => {
      this.doctorOptions = doctors;
    });

    this.scheduleService.getOperatingRooms().subscribe(rooms => {
      this.operatingRoomOptions = rooms;
    });

    this.scheduleService.getSurgeryTypes().subscribe(types => {
      this.surgeryTypeOptions = types;
    });
  }

  /**
   * 监听表单变化
   */
  private subscribeToFormChanges(): void {
    this.filterForm.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.applyFilter();
      });
  }

  /**
   * 应用筛选
   */
  applyFilter(): void {
    const formValue = this.filterForm.value;
    const filters: FilterCriteria = {};

    // 日期范围
    if (formValue.dateRange && formValue.dateRange.length === 2) {
      filters.startDate = formValue.dateRange[0];
      filters.endDate = formValue.dateRange[1];
    }

    // 关键字
    if (typeof formValue.keyword === 'string' && formValue.keyword.trim()) {
      filters.keyword = formValue.keyword.trim();
    }

    // 急/择
    if (formValue.urgency) {
      filters.urgency = formValue.urgency as UrgencyLevel;
    }

    // 医生
    if (formValue.doctorName) {
      filters.doctorName = formValue.doctorName;
    }

    // 手术室
    if (formValue.operatingRoom) {
      filters.operatingRoom = formValue.operatingRoom;
    }

    // 状态
    if (formValue.status && formValue.status.length > 0) {
      filters.status = formValue.status as ScheduleStatus[];
    } else if (formValue.statusSegment && formValue.statusSegment !== 'all') {
      filters.status = [formValue.statusSegment as ScheduleStatus];
    }

    // 手术类型
    if (formValue.surgeryType) {
      filters.surgeryType = formValue.surgeryType;
    }

    this.filterChange.emit(filters);
  }

  /**
   * 重置筛选
   */
  handleReset(): void {
    this.filterForm.reset();
    this.filterForm.patchValue({ statusSegment: 'all' }, { emitEvent: false });
    this.reset.emit();
  }

  /**
   * 日期快捷：前一天/后一天/今天
   */
  shiftDateRange(days: number): void {
    const current = this.filterForm.get('dateRange')?.value as [Date, Date] | null;
    if (!current || current.length !== 2) {
      this.setTodayRange();
      return;
    }

    const [start, end] = current;
    const nextStart = new Date(start);
    const nextEnd = new Date(end);
    nextStart.setDate(nextStart.getDate() + days);
    nextEnd.setDate(nextEnd.getDate() + days);

    this.filterForm.patchValue({ dateRange: [nextStart, nextEnd] });
  }

  setTodayRange(): void {
    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    this.filterForm.patchValue({ dateRange: [start, end] });
  }

  /**
   * 切换折叠状态
   */
  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }
}
