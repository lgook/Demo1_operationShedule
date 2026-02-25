import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { SurgerySchedule, FilterCriteria, ConflictResult } from '../models/surgery-schedule.model';

@Injectable({
  providedIn: 'root'
})
export class SurgeryScheduleService {
  private readonly STORAGE_KEY = 'surgery_schedules';
  private schedulesSubject = new BehaviorSubject<SurgerySchedule[]>([]);
  public schedules$ = this.schedulesSubject.asObservable();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * 从 localStorage 加载数据
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const schedules: SurgerySchedule[] = JSON.parse(stored);
        // 转换日期字符串为 Date 对象
        schedules.forEach(schedule => {
          schedule.startTime = new Date(schedule.startTime);
          schedule.endTime = new Date(schedule.endTime);
        });
        // 兼容旧数据：补齐新增字段默认值
        const normalized = schedules.map(s => {
          const urgency = s.urgency ?? (Math.random() < 0.25 ? 'urgent' : 'elective');
          const status = (s.status as SurgerySchedule['status']) ?? 'unscheduled';
          return {
            ...s,
            status,
            urgency
          };
        });
        this.schedulesSubject.next(normalized);
      }
    } catch (error) {
      console.error('Failed to load schedules from storage:', error);
    }
  }

  /**
   * 保存数据到 localStorage
   */
  private saveToStorage(schedules: SurgerySchedule[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(schedules));
    } catch (error) {
      console.error('Failed to save schedules to storage:', error);
    }
  }

  /**
   * 获取所有排班（支持筛选）
   */
  getSchedules(filters?: FilterCriteria): Observable<SurgerySchedule[]> {
    return this.schedules$.pipe(
      map(schedules => {
        if (!filters) {
          return schedules;
        }

        return schedules.filter(schedule => {
          // 日期范围筛选
          if (filters.startDate && schedule.startTime < filters.startDate) {
            return false;
          }
          if (filters.endDate && schedule.startTime > filters.endDate) {
            return false;
          }

          // 关键字筛选（患者/住院号/诊断/手术类型/医生）
          if (filters.keyword) {
            const kw = filters.keyword.toLowerCase();
            const haystack = [
              schedule.patientName,
              schedule.inpatientNo,
              schedule.diagnosis,
              schedule.surgeryType,
              schedule.doctorName,
              ...(schedule.assistantDoctors || [])
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            if (!haystack.includes(kw)) {
              return false;
            }
          }

          // 急/择筛选
          if (filters.urgency && schedule.urgency !== filters.urgency) {
            return false;
          }

          // 医生筛选
          if (filters.doctorName && schedule.doctorName !== filters.doctorName) {
            return false;
          }

          // 手术室筛选
          if (filters.operatingRoom && schedule.operatingRoom !== filters.operatingRoom) {
            return false;
          }

          // 状态筛选
          if (filters.status && filters.status.length > 0 && !filters.status.includes(schedule.status)) {
            return false;
          }

          // 手术类型筛选
          if (filters.surgeryType && schedule.surgeryType !== filters.surgeryType) {
            return false;
          }

          return true;
        });
      }),
      delay(300) // 模拟 API 延迟
    );
  }

  /**
   * 根据 ID 获取排班
   */
  getScheduleById(id: string): Observable<SurgerySchedule | undefined> {
    return this.schedules$.pipe(
      map(schedules => schedules.find(s => s.id === id)),
      delay(100)
    );
  }

  /**
   * 创建新排班
   */
  createSchedule(schedule: SurgerySchedule): Observable<SurgerySchedule> {
    return new Observable(observer => {
      setTimeout(() => {
        const schedules = this.schedulesSubject.value;
        const newSchedule = {
          ...schedule,
          id: this.generateId()
        };
        const updatedSchedules = [...schedules, newSchedule];
        this.schedulesSubject.next(updatedSchedules);
        this.saveToStorage(updatedSchedules);
        observer.next(newSchedule);
        observer.complete();
      }, 300);
    });
  }

  /**
   * 更新排班
   */
  updateSchedule(id: string, schedule: Partial<SurgerySchedule>): Observable<SurgerySchedule> {
    return new Observable(observer => {
      setTimeout(() => {
        const schedules = this.schedulesSubject.value;
        const index = schedules.findIndex(s => s.id === id);
        
        if (index === -1) {
          observer.error(new Error('Schedule not found'));
          return;
        }

        const updatedSchedule = { ...schedules[index], ...schedule, id };
        const updatedSchedules = [
          ...schedules.slice(0, index),
          updatedSchedule,
          ...schedules.slice(index + 1)
        ];
        
        this.schedulesSubject.next(updatedSchedules);
        this.saveToStorage(updatedSchedules);
        observer.next(updatedSchedule);
        observer.complete();
      }, 300);
    });
  }

  /**
   * 删除排班
   */
  deleteSchedule(id: string): Observable<void> {
    return new Observable(observer => {
      setTimeout(() => {
        const schedules = this.schedulesSubject.value;
        const updatedSchedules = schedules.filter(s => s.id !== id);
        this.schedulesSubject.next(updatedSchedules);
        this.saveToStorage(updatedSchedules);
        observer.next();
        observer.complete();
      }, 300);
    });
  }

  /**
   * 检查时间冲突
   */
  checkTimeConflict(schedule: SurgerySchedule, excludeId?: string): Observable<ConflictResult> {
    return this.schedules$.pipe(
      map(schedules => {
        const conflictingSchedules = schedules.filter(s => {
          // 排除当前正在编辑的排班
          if (excludeId && s.id === excludeId) {
            return false;
          }

          // 检查手术室冲突
          if (s.operatingRoom !== schedule.operatingRoom) {
            return false;
          }

          // 检查时间冲突
          const startTime = schedule.startTime.getTime();
          const endTime = schedule.endTime.getTime();
          const sStartTime = s.startTime.getTime();
          const sEndTime = s.endTime.getTime();

          // 时间段重叠判断
          return (
            (startTime >= sStartTime && startTime < sEndTime) ||
            (endTime > sStartTime && endTime <= sEndTime) ||
            (startTime <= sStartTime && endTime >= sEndTime)
          );
        });

        const hasConflict = conflictingSchedules.length > 0;
        let message = '';

        if (hasConflict) {
          const rooms = conflictingSchedules.map(s => s.operatingRoom).join(', ');
          message = `手术室 ${schedule.operatingRoom} 在该时间段已有排班`;
        }

        return {
          hasConflict,
          conflictingSchedules,
          message
        };
      }),
      delay(100)
    );
  }

  /**
   * 获取所有医生列表
   */
  getDoctors(): Observable<string[]> {
    return this.schedules$.pipe(
      map(schedules => {
        const doctors = new Set<string>();
        schedules.forEach(schedule => {
          doctors.add(schedule.doctorName);
          schedule.assistantDoctors.forEach(doctor => doctors.add(doctor));
        });
        return Array.from(doctors).sort();
      })
    );
  }

  /**
   * 获取所有手术室列表
   */
  getOperatingRooms(): Observable<string[]> {
    return this.schedules$.pipe(
      map(schedules => {
        const rooms = new Set<string>();
        schedules.forEach(schedule => rooms.add(schedule.operatingRoom));
        return Array.from(rooms).sort();
      })
    );
  }

  /**
   * 获取所有手术类型列表
   */
  getSurgeryTypes(): Observable<string[]> {
    return this.schedules$.pipe(
      map(schedules => {
        const types = new Set<string>();
        schedules.forEach(schedule => types.add(schedule.surgeryType));
        return Array.from(types).sort();
      })
    );
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 批量导入排班数据（用于初始化）
   */
  importSchedules(schedules: SurgerySchedule[]): void {
    this.schedulesSubject.next(schedules);
    this.saveToStorage(schedules);
  }

  /**
   * 追加一批排班/申请（用于“获取申请”等）
   */
  appendSchedules(schedules: SurgerySchedule[]): void {
    if (!schedules || schedules.length === 0) return;
    const current = this.schedulesSubject.value;
    const updated = [...current, ...schedules];
    this.schedulesSubject.next(updated);
    this.saveToStorage(updated);
  }

  /**
   * 清空所有数据
   */
  clearAll(): void {
    this.schedulesSubject.next([]);
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
