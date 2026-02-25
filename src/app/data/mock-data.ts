import { SurgerySchedule } from '../models/surgery-schedule.model';

function reviveSchedules(raw: any[]): SurgerySchedule[] {
  return (raw || []).map((s: any) => ({
    ...s,
    startTime: new Date(s.startTime),
    endTime: new Date(s.endTime)
  }));
}

/**
 * 生成模拟手术排班数据
 */
export function generateMockSchedules(): SurgerySchedule[] {
  const today = new Date();
  const schedules: SurgerySchedule[] = [];

  // 手术类型
  const surgeryTypes = [
    '阑尾切除术',
    '胆囊切除术',
    '骨折内固定术',
    '白内障手术',
    '剖腹产',
    '心脏搭桥术',
    '肿瘤切除术',
    '关节置换术'
  ];

  // 医生
  const doctors = ['张医生', '李医生', '王医生', '赵医生', '刘医生', '陈医生'];
  
  // 手术室
  const rooms = ['手术室1', '手术室2', '手术室3', '手术室4', '手术室5'];

  const depts = ['普外科', '骨科', '心胸外科', '妇产科', '眼科', '泌尿外科', '神经外科'];
  const wards = ['一病区', '二病区', '三病区', '特需病区'];
  const diagnoses = [
    '急性阑尾炎',
    '胆囊结石伴胆囊炎',
    '股骨颈骨折',
    '白内障',
    '子宫肌瘤',
    '冠心病三支病变',
    '膀胱肿瘤'
  ];

  // 患者姓名
  const patients = [
    '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
    '郑十一', '王十二', '冯十三', '陈十四', '褚十五', '卫十六', '蒋十七', '沈十八'
  ];

  // 状态权重（更多已安排的）
  const statuses: Array<{ status: SurgerySchedule['status'], weight: number }> = [
    { status: 'unscheduled', weight: 15 },
    { status: 'scheduled', weight: 60 },
    { status: 'in-progress', weight: 15 },
    { status: 'completed', weight: 20 },
    { status: 'cancelled', weight: 5 }
  ];

  // 生成未来7天和过去7天的数据
  for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() + dayOffset);
    
    // 每天生成2-5个手术
    const numSurgeries = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < numSurgeries; i++) {
      // 随机开始时间 (8:00 - 16:00)
      const startHour = Math.floor(Math.random() * 8) + 8;
      const startMinute = Math.random() < 0.5 ? 0 : 30;
      
      const startTime = new Date(dayDate);
      startTime.setHours(startHour, startMinute, 0, 0);
      
      // 随机手术时长 (1-4小时)
      const durationHours = Math.floor(Math.random() * 3) + 1;
      const durationMinutes = Math.random() < 0.5 ? 0 : 30;
      
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + durationHours);
      endTime.setMinutes(startTime.getMinutes() + durationMinutes);
      
      // 随机选择状态（根据权重）
      const randomWeight = Math.random() * 100;
      let cumulativeWeight = 0;
      let selectedStatus: SurgerySchedule['status'] = 'scheduled';
      
      for (const statusObj of statuses) {
        cumulativeWeight += statusObj.weight;
        if (randomWeight <= cumulativeWeight) {
          selectedStatus = statusObj.status;
          break;
        }
      }
      
      // 对于未来的日期，只使用 'scheduled' 状态
      if (dayOffset > 0) {
        selectedStatus = 'scheduled';
      }
      
      // 对于今天，可能是 'scheduled' 或 'in-progress'
      if (dayOffset === 0 && selectedStatus === 'completed') {
        selectedStatus = Math.random() < 0.5 ? 'scheduled' : 'in-progress';
      }
      
      // 随机选择医生和助理
      const doctorIndex = Math.floor(Math.random() * doctors.length);
      const assistantCount = Math.floor(Math.random() * 3); // 0-2个助理
      const assistants: string[] = [];
      
      for (let j = 0; j < assistantCount; j++) {
        let assistantIndex;
        do {
          assistantIndex = Math.floor(Math.random() * doctors.length);
        } while (assistantIndex === doctorIndex || assistants.includes(doctors[assistantIndex]));
        assistants.push(doctors[assistantIndex]);
      }

      const gender = Math.random() < 0.5 ? '男' : '女';
      const age = Math.floor(Math.random() * 60) + 18; // 18-77
      const inpatientNo = `${new Date().getFullYear().toString().slice(-2)}${String(
        Math.floor(Math.random() * 999999)
      ).padStart(6, '0')}`;

      const dept = depts[Math.floor(Math.random() * depts.length)];
      const ward = wards[Math.floor(Math.random() * wards.length)];
      const bedNo = String(Math.floor(Math.random() * 40) + 1);
      const diagnosis = diagnoses[Math.floor(Math.random() * diagnoses.length)];

      const urgency = Math.random() < 0.25 ? 'urgent' : 'elective';
      const anesthetistName = doctors[Math.floor(Math.random() * doctors.length)];
      
      const schedule: SurgerySchedule = {
        id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`,
        patientName: patients[Math.floor(Math.random() * patients.length)],
        gender,
        age,
        inpatientNo,
        dept,
        ward,
        bedNo,
        diagnosis,
        surgeryType: surgeryTypes[Math.floor(Math.random() * surgeryTypes.length)],
        doctorName: doctors[doctorIndex],
        assistantDoctors: assistants,
        anesthetistName,
        operatingRoom: rooms[Math.floor(Math.random() * rooms.length)],
        startTime: startTime,
        endTime: endTime,
        urgency,
        status: selectedStatus,
        notes: Math.random() < 0.3 ? '常规手术，患者情况稳定' : undefined
      };
      
      schedules.push(schedule);
    }
  }
  
  // 按开始时间排序
  schedules.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  return schedules;
}

/**
 * 模拟第三方“手术申请”拉取（大部分是未安排）
 */
export function generateMockApplications(count = 20): SurgerySchedule[] {
  const today = new Date();
  const surgeryTypes = [
    '阑尾切除术',
    '胆囊切除术',
    '骨折内固定术',
    '白内障手术',
    '剖腹产',
    '心脏搭桥术',
    '肿瘤切除术',
    '关节置换术'
  ];
  const doctors = ['张医生', '李医生', '王医生', '赵医生', '刘医生', '陈医生'];
  const depts = ['普外科', '骨科', '心胸外科', '妇产科', '眼科', '泌尿外科', '神经外科'];
  const wards = ['一病区', '二病区', '三病区', '特需病区'];
  const diagnoses = [
    '急性阑尾炎',
    '胆囊结石伴胆囊炎',
    '股骨颈骨折',
    '白内障',
    '子宫肌瘤',
    '冠心病三支病变',
    '膀胱肿瘤'
  ];
  const patients = [
    '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
    '郑十一', '王十二', '冯十三', '陈十四', '褚十五', '卫十六', '蒋十七', '沈十八'
  ];

  const result: SurgerySchedule[] = [];
  for (let i = 0; i < count; i++) {
    const startTime = new Date(today);
    startTime.setHours(8 + Math.floor(Math.random() * 10), Math.random() < 0.5 ? 0 : 30, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1 + Math.floor(Math.random() * 3));

    const doctorIndex = Math.floor(Math.random() * doctors.length);
    const assistants = Math.random() < 0.5 ? [] : [doctors[(doctorIndex + 1) % doctors.length]];
    const inpatientNo = `${new Date().getFullYear().toString().slice(-2)}${String(
      Math.floor(Math.random() * 999999)
    ).padStart(6, '0')}`;

    result.push({
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`,
      patientName: patients[Math.floor(Math.random() * patients.length)],
      gender: Math.random() < 0.5 ? '男' : '女',
      age: Math.floor(Math.random() * 60) + 18,
      inpatientNo,
      dept: depts[Math.floor(Math.random() * depts.length)],
      ward: wards[Math.floor(Math.random() * wards.length)],
      bedNo: String(Math.floor(Math.random() * 40) + 1),
      diagnosis: diagnoses[Math.floor(Math.random() * diagnoses.length)],
      surgeryType: surgeryTypes[Math.floor(Math.random() * surgeryTypes.length)],
      doctorName: doctors[doctorIndex],
      assistantDoctors: assistants,
      anesthetistName: doctors[Math.floor(Math.random() * doctors.length)],
      operatingRoom: '待分配',
      startTime,
      endTime,
      urgency: Math.random() < 0.2 ? 'urgent' : 'elective',
      status: 'unscheduled',
      notes: '来源：第三方申请（模拟）'
    });
  }

  return result;
}

/**
 * 初始化模拟数据到服务
 */
export function initializeMockData(): SurgerySchedule[] {
  // 检查是否已有数据
  const existing = localStorage.getItem('surgery_schedules');
  
  if (!existing) {
    const mockData = generateMockSchedules();
    localStorage.setItem('surgery_schedules', JSON.stringify(mockData));
    console.log('✅ 已加载模拟数据:', mockData.length, '条排班记录');
    return mockData;
  }

  try {
    const parsed = JSON.parse(existing);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return reviveSchedules(parsed);
    }
  } catch {
    // ignore
  }

  // 若本地数据为空或损坏，重新生成
  const mockData = generateMockSchedules();
  localStorage.setItem('surgery_schedules', JSON.stringify(mockData));
  console.log('✅ 已重新加载模拟数据:', mockData.length, '条排班记录');
  return mockData;
}
