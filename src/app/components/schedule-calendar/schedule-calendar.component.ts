import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CalendarOptions, EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { SurgerySchedule, scheduleToCalendarEvent, CalendarEvent } from '../../models/surgery-schedule.model';

@Component({
  selector: 'app-schedule-calendar',
  templateUrl: './schedule-calendar.component.html',
  styleUrls: ['./schedule-calendar.component.scss']
})
export class ScheduleCalendarComponent implements OnInit, OnChanges {
  @Input() schedules: SurgerySchedule[] = [];
  @Input() loading = false;
  
  @Output() eventClick = new EventEmitter<SurgerySchedule>();
  @Output() eventDrop = new EventEmitter<{ schedule: SurgerySchedule; newStart: Date; newEnd: Date }>();
  @Output() dateSelect = new EventEmitter<{ start: Date; end: Date }>();

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    locale: 'zh-cn',
    buttonText: {
      today: '今天',
      month: '月',
      week: '周',
      day: '日'
    },
    slotMinTime: '07:00:00',
    slotMaxTime: '21:00:00',
    slotDuration: '00:30:00',
    allDaySlot: false,
    height: 'auto',
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    weekends: true,
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    select: this.handleDateSelect.bind(this),
    eventContent: this.renderEventContent.bind(this),
    events: []
  };

  ngOnInit(): void {
    this.updateCalendarEvents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schedules']) {
      this.updateCalendarEvents();
    }
  }

  /**
   * 更新日历事件
   */
  private updateCalendarEvents(): void {
    const events = this.schedules.map(schedule => scheduleToCalendarEvent(schedule));
    this.calendarOptions = {
      ...this.calendarOptions,
      events: events
    };
  }

  /**
   * 处理事件点击
   */
  private handleEventClick(clickInfo: EventClickArg): void {
    const schedule = clickInfo.event.extendedProps['schedule'] as SurgerySchedule;
    if (schedule) {
      this.eventClick.emit(schedule);
    }
  }

  /**
   * 处理事件拖拽
   */
  private handleEventDrop(dropInfo: EventDropArg): void {
    const schedule = dropInfo.event.extendedProps['schedule'] as SurgerySchedule;
    if (schedule && dropInfo.event.start && dropInfo.event.end) {
      this.eventDrop.emit({
        schedule: schedule,
        newStart: dropInfo.event.start,
        newEnd: dropInfo.event.end
      });
    }
  }

  /**
   * 处理日期选择（用于快速创建）
   */
  private handleDateSelect(selectInfo: DateSelectArg): void {
    this.dateSelect.emit({
      start: selectInfo.start,
      end: selectInfo.end
    });
  }

  /**
   * 自定义事件渲染
   */
  private renderEventContent(eventInfo: any): { html: string } {
    const schedule = eventInfo.event.extendedProps.schedule as SurgerySchedule;
    const statusClass = `fc-event-${schedule.status}`;
    
    return {
      html: `
        <div class="fc-event-main-frame ${statusClass}">
          <div class="fc-event-time">${eventInfo.timeText}</div>
          <div class="fc-event-title-container">
            <div class="fc-event-title fc-sticky">
              <strong>${schedule.patientName}</strong>
              <br>
              <small>${schedule.surgeryType}</small>
              <br>
              <small>医生: ${schedule.doctorName}</small>
              <br>
              <small>${schedule.operatingRoom}</small>
            </div>
          </div>
        </div>
      `
    };
  }
}
