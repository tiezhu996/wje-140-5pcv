import { Injectable } from '@nestjs/common';
import { VehicleStatus } from '../types/enums';
@Injectable()
export class VehicleService {
  private rows = [{ id: 1, plateNo: '沪A-7821', vehicleType: 'Refrigerated', brandModel: '东风天锦 KR', purchaseDate: '2023-03-12', insuranceExpireDate: '2026-09-30', inspectionExpireDate: '2026-11-20', status: 'Available', mileage: 88210, tankCapacity: 380, dailyFixedCost: 260 }];
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) { const row = { ...payload, id: this.rows.length + 1 }; this.rows.push(row); return row; }
  // 比较并交换：仅当车辆当前状态等于 from 时才流转到 to，并发/重复流转只能成功一次
  transitionStatus(id: number, from: VehicleStatus, to: VehicleStatus) {
    const vehicle = this.rows.find((item: any) => item.id === id);
    if (!vehicle || vehicle.status !== from) return null;
    vehicle.status = to;
    return vehicle;
  }
  updateMileage(id: number, mileage: number) {
    const vehicle = this.rows.find((item: any) => item.id === id);
    if (!vehicle) return null;
    vehicle.mileage = mileage;
    return vehicle;
  }
}
