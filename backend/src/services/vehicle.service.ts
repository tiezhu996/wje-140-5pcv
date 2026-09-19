import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { VehicleStatus } from '../types/enums';
@Injectable()
export class VehicleService {
  private rows = [{ id: 1, plateNo: '沪A-7821', vehicleType: 'Refrigerated', brandModel: '东风天锦 KR', purchaseDate: '2023-03-12', insuranceExpireDate: '2026-09-30', inspectionExpireDate: '2026-11-20', status: 'Available', mileage: 88210, tankCapacity: 380, dailyFixedCost: 260 }];
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) { const row = { ...payload, id: this.rows.length + 1 }; this.rows.push(row); return row; }
  markUnderMaintenance(id: number) {
    const row = this.findOne(id);
    if (!row) throw new NotFoundException(`车辆 ${id} 不存在`);
    if (row.status !== VehicleStatus.Available) throw new ConflictException(`车辆 ${id} 当前状态为 ${row.status}，仅可用车辆允许开始维保`);
    row.status = VehicleStatus.Maintenance;
    return row;
  }
  markAvailable(id: number) {
    const row = this.findOne(id);
    if (!row) throw new NotFoundException(`车辆 ${id} 不存在`);
    if (row.status !== VehicleStatus.Maintenance) throw new ConflictException(`车辆 ${id} 当前状态为 ${row.status}，仅维保中车辆可恢复可用`);
    row.status = VehicleStatus.Available;
    return row;
  }
  updateMileage(id: number, mileage: number) {
    const row = this.findOne(id);
    if (!row) throw new NotFoundException(`车辆 ${id} 不存在`);
    if (mileage > row.mileage) row.mileage = mileage;
    return row;
  }
}
