import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SurgerySchedule, ScheduleStatus, STATUS_OPTIONS } from '../../models/surgery-schedule.model';
import { SurgeryScheduleService } from '../../services/surgery-schedule.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-schedule-form',
  templateUrl: './schedule-form.component.html',
  styleUrls: ['./schedule-form.component.scss']
})
export class ScheduleFormComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() schedule: SurgerySchedule | null = null;
  @Input() prefilledData: { start?: Date; end?: Date } | null = null;
  
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() submitSuccess = new EventEmitter<SurgerySchedule>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  loading = false;
  isEditMode = false;

  // 选项列表
  statusOptions = STATUS_OPTIONS;
  doctorOptions: string[] = [];
  assistantDoctorOptions: string[] = [];
  operatingRoomOptions: string[] = [];
  surgeryTypeOptions: string[] = [];

  // 预定义选项
  predefinedDoctors = ['张医生', '李医生', '王医生', '赵医生', '刘医生', '陈医生'];
  predefinedRooms = ['手术室1', '手术室2', '手术室3', '手术室4', '手术室5'];
  predefinedSurgeryTypes = [
    '阑尾切除术',
    '胆囊切除术',
    '骨折内固定术',
    '白内障手术',
    '剖腹产',
    '心脏搭桥术',
    '肿瘤切除术',
    '关节置换术'
  ];

  constructor(
    private fb: FormBuilder,
    private scheduleService: SurgeryScheduleService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schedule'] && this.schedule) {
      this.isEditMode = true;
      this.fillForm(this.schedule);
    } else if (changes['visible'] && this.visible && !this.schedule) {
      this.isEditMode = false;
      this.form.reset();
      
      // 如果有预填充数据，填充开始和结束时间
      if (this.prefilledData) {
        if (this.prefilledData.start) {
          this.form.patchValue({ startTime: this.prefilledData.start });
        }
        if (this.prefilledData.end) {
          this.form.patchValue({ endTime: this.prefilledData.end });
        }
      }
    }
  }

  /**
   * 初始化表单
   */
  private initForm(): void {
    this.form = this.fb.group({
      patientName: ['', [Validators.required, Validators.minLength(2)]],
      surgeryType: ['', Validators.required],
      doctorName: ['', Validators.required],
      assistantDoctors: [[]],
      operatingRoom: ['', Validators.required],
      startTime: [null, Validators.required],
      endTime: [null, Validators.required],
      status: ['scheduled', Validators.required],
      notes: ['']
    });
  }

  /**
   * 加载选项列表
   */
  private loadOptions(): void {
    // 从服务加载已有选项
    this.scheduleService.getDoctors().subscribe(doctors => {
      this.doctorOptions = [...new Set([...doctors, ...this.predefinedDoctors])];
      this.assistantDoctorOptions = this.doctorOptions;
    });

    this.scheduleService.getOperatingRooms().subscribe(rooms => {
      this.operatingRoomOptions = [...new Set([...rooms, ...this.predefinedRooms])];
    });

    this.scheduleService.getSurgeryTypes().subscribe(types => {
      this.surgeryTypeOptions = [...new Set([...types, ...this.predefinedSurgeryTypes])];
    });
  }

  /**
   * 填充表单数据
   */
  private fillForm(schedule: SurgerySchedule): void {
    this.form.patchValue({
      patientName: schedule.patientName,
      surgeryType: schedule.surgeryType,
      doctorName: schedule.doctorName,
      assistantDoctors: schedule.assistantDoctors,
      operatingRoom: schedule.operatingRoom,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: schedule.status,
      notes: schedule.notes || ''
    });
  }

  /**
   * 提交表单
   */
  handleSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const formValue = this.form.value;
    const scheduleData: SurgerySchedule = {
      id: this.schedule?.id || '',
      patientName: formValue.patientName,
      surgeryType: formValue.surgeryType,
      doctorName: formValue.doctorName,
      assistantDoctors: formValue.assistantDoctors || [],
      operatingRoom: formValue.operatingRoom,
      startTime: new Date(formValue.startTime),
      endTime: new Date(formValue.endTime),
      status: formValue.status as ScheduleStatus,
      notes: formValue.notes
    };

    // 验证时间
    if (scheduleData.endTime <= scheduleData.startTime) {
      this.message.error('结束时间必须晚于开始时间');
      return;
    }

    // 检查时间冲突
    this.loading = true;
    this.scheduleService.checkTimeConflict(scheduleData, this.schedule?.id).subscribe(result => {
      if (result.hasConflict) {
        this.message.warning(result.message || '存在时间冲突');
        this.loading = false;
        return;
      }

      // 保存数据
      const saveObservable = this.isEditMode
        ? this.scheduleService.updateSchedule(scheduleData.id, scheduleData)
        : this.scheduleService.createSchedule(scheduleData);

      saveObservable.subscribe({
        next: (savedSchedule) => {
          this.message.success(this.isEditMode ? '更新成功' : '创建成功');
          this.submitSuccess.emit(savedSchedule);
          this.handleCancel();
          this.loading = false;
        },
        error: (error) => {
          this.message.error('保存失败：' + error.message);
          this.loading = false;
        }
      });
    });
  }

  /**
   * 取消
   */
  handleCancel(): void {
    this.form.reset();
    this.isEditMode = false;
    this.visible = false;
    this.visibleChange.emit(false);
    this.cancel.emit();
  }

  /**
   * 删除排班
   */
  handleDelete(): void {
    if (!this.schedule) return;
    const s = this.schedule;

    this.modal.confirm({
      nzTitle: '确认删除',
      nzContent: `确定要删除患者"${s.patientName}"的手术排班吗？此操作不可恢复。`,
      nzOkText: '删除',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () => {
        return new Promise<void>((resolve, reject) => {
          this.loading = true;
          this.scheduleService.deleteSchedule(s.id).subscribe({
            next: () => {
              this.message.success('删除成功');
              this.submitSuccess.emit(s);
              this.handleCancel();
              this.loading = false;
              resolve();
            },
            error: (error) => {
              this.message.error('删除失败：' + error.message);
              this.loading = false;
              reject(error);
            }
          });
        });
      }
    });
  }
}
