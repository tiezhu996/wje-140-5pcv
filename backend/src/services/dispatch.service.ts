import { Injectable } from '@nestjs/common';
import { DispatchStatus } from '../types/enums';
@Injectable()
export class DispatchService {
  private rows = [{ id: 1, orderNo: 'DSP-20260612-0001', vehicleId: 1, driverId: 1, origin: '上海青浦仓', destination: '杭州萧山仓', planDepartAt: '2026-06-12 09:00', planArriveAt: '2026-06-12 13:30', cargo: '冷链食品', weight: 8200, volume: 42, freight: 7200, estimatedFuelCost: 1500, estimatedTollCost: 420, status: 'Assigned', profit: 4180 }];
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) { const row = { ...payload, id: this.rows.length + 1 }; this.rows.push(row); return row; }
  // 统计指定车辆指定月份已完成订单的运费总额，供费用汇总重算总收入
  sumCompletedFreight(vehicleId: number, month: string) {
    return this.rows
      .filter((item: any) => item.vehicleId === vehicleId && item.status === DispatchStatus.Completed
        && String(item.actualArriveAt ?? item.planArriveAt ?? item.planDepartAt ?? '').slice(0, 7) === month)
      .reduce((sum: number, item: any) => sum + Number(item.freight || 0), 0);
  }
}
