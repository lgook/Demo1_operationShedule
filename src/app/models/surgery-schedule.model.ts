/**
 * 手术排班状态
 */
export type ScheduleStatus = 'unscheduled' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

/**
 * 急/择
 */
export type UrgencyLevel = 'urgent' | 'elective';

/**
 * 手术排班接口
 */
export interface SurgerySchedule {
  /** 唯一标识符 */
  id: string;
  /** 患者姓名 */
  patientName: string;
  /** 性别 */
  gender?: '男' | '女';
  /** 年龄 */
  age?: number;
  /** 住院号/病案号 */
  inpatientNo?: string;
  /** 科室 */
  dept?: string;
  /** 病区 */
  ward?: string;
  /** 床号 */
  bedNo?: string;
  /** 诊断 */
  diagnosis?: string;
  /** 手术类型 */
  surgeryType: string;
  /** 主刀医生 */
  doctorName: string;
  /** 助理医生 */
  assistantDoctors: string[];
  /** 麻醉医生（可选） */
  anesthetistName?: string;
  /** 器械/巡回护士（可选） */
  nurseNames?: string[];
  /** 手术室 */
  operatingRoom: string;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 急/择 */
  urgency?: UrgencyLevel;
  /** 状态 */
  status: ScheduleStatus;
  /** 备注 */
  notes?: string;
}

/**
 * 筛选条件接口
 */
export interface FilterCriteria {
  /** 开始日期 */
  startDate?: Date;
  /** 结束日期 */
  endDate?: Date;
  /** 关键字（患者/住院号/诊断/手术名/医生） */
  keyword?: string;
  /** 急/择 */
  urgency?: UrgencyLevel;
  /** 医生姓名 */
  doctorName?: string;
  /** 手术室 */
  operatingRoom?: string;
  /** 状态 */
  status?: ScheduleStatus[];
  /** 手术类型 */
  surgeryType?: string;
}

/**
 * 状态选项
 */
export interface StatusOption {
  label: string;
  value: ScheduleStatus;
  color: string;
}

/**
 * 状态配置
 */
export const STATUS_OPTIONS: StatusOption[] = [
  { label: '未安排', value: 'unscheduled', color: '#faad14' },
  { label: '已安排', value: 'scheduled', color: '#1890ff' },
  { label: '进行中', value: 'in-progress', color: '#52c41a' },
  { label: '已完成', value: 'completed', color: '#8c8c8c' },
  { label: '已取消', value: 'cancelled', color: '#f5222d' }
];

/**
 * 获取状态标签
 */
export function getStatusLabel(status: ScheduleStatus): string {
  const option = STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.label : status;
}

/**
 * 获取状态颜色
 */
export function getStatusColor(status: ScheduleStatus): string {
  const option = STATUS_OPTIONS.find(opt => opt.value === status);
  return option ? option.color : '#000000';
}

/**
 * FullCalendar 事件接口
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    schedule: SurgerySchedule;
  };
}

/**
 * 将排班转换为日历事件
 */
export function scheduleToCalendarEvent(schedule: SurgerySchedule): CalendarEvent {
  const color = getStatusColor(schedule.status);
  return {
    id: schedule.id,
    title: `${schedule.patientName} - ${schedule.surgeryType}`,
    start: schedule.startTime,
    end: schedule.endTime,
    backgroundColor: color,
    borderColor: color,
    extendedProps: {
      schedule: schedule
    }
  };
}

/**
 * 时间冲突检测结果
 */
export interface ConflictResult {
  hasConflict: boolean;
  conflictingSchedules: SurgerySchedule[];
  message?: string;
}
