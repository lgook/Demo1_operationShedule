import { Component, OnInit } from '@angular/core';
import { initializeMockData } from './data/mock-data';
import { SurgeryScheduleService } from './services/surgery-schedule.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = '手术排班管理系统';

  constructor(private scheduleService: SurgeryScheduleService) {}

  ngOnInit(): void {
    // 初始化模拟数据
    const data = initializeMockData();
    // 关键：将初始化数据导入到 service，触发页面刷新
    this.scheduleService.importSchedules(data);
  }
}
