import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, VehicleStatus } from '../types/enums';
import { VehicleService } from './vehicle.service';
import { CostService } from './cost.service';
@Injectable()
export class MaintenanceService {
  private rows: any[] = [
    { id: 1, vehicleId: 1, maintenanceType: 'Routine', item: '机油与制动检查', cost: 2100, vendor: '青浦维保站', date: '2026-06-06', nextMileage: 93000, nextDate: '2026-09-06', status: 'Completed' },
    { id: 2, vehicleId: 1, maintenanceType: 'Inspection', item: '年检前整车检查', cost: 0, vendor: '青浦维保站', date: '2026-09-19', nextMileage: 95000, nextDate: '2026-12-19', status: 'Scheduled' },
  ];
  constructor(
    private readonly vehicleService: VehicleService,
    private readonly costService: CostService,
  ) {}
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) {
    const row = { status: MaintenanceStatus.Scheduled, ...payload, id: this.rows.length + 1 };
    this.rows.push(row);
    return row;
  }
  // 开始维保：仅计划中的工单可开始，且仅允许可用车辆；成功后车辆转入维保状态
  start(id: number) {
    const record = this.rows.find((item: any) => item.id === id);
    if (!record) throw new NotFoundException('维保记录不存在');
    if (record.status !== MaintenanceStatus.Scheduled) throw new ConflictException('仅计划中的维保可开始');
    const vehicle = this.vehicleService.findOne(record.vehicleId);
    if (!vehicle) throw new NotFoundException('关联车辆不存在');
    const transitioned = this.vehicleService.transitionStatus(record.vehicleId, VehicleStatus.Available, VehicleStatus.Maintenance);
    if (!transitioned) throw new ConflictException('仅可用状态的车辆可开始维保');
    record.status = MaintenanceStatus.InProgress;
    record.startedAt = new Date().toISOString();
    return record;
  }
  // 完成维保：必须提交实际费用与完成里程；先完成全部校验再一次性落库，失败不得半更新
  complete(id: number, payload: any) {
    const record = this.rows.find((item: any) => item.id === id);
    if (!record) throw new NotFoundException('维保记录不存在');
    if (record.status === MaintenanceStatus.Completed) throw new ConflictException('维保已完成，请勿重复提交');
    if (record.status !== MaintenanceStatus.InProgress) throw new ConflictException('仅进行中的维保可完成');
    const actualCost = Number(payload?.actualCost);
    const completionMileage = Number(payload?.completionMileage);
    if (!Number.isFinite(actualCost) || actualCost < 0) throw new BadRequestException('必须提交有效的实际费用');
    if (!Number.isFinite(completionMileage) || completionMileage < 0) throw new BadRequestException('必须提交有效的完成里程');
    const vehicle = this.vehicleService.findOne(record.vehicleId);
    if (!vehicle) throw new NotFoundException('关联车辆不存在');
    if (completionMileage < vehicle.mileage) throw new BadRequestException('完成里程小于车辆当前里程，整单拒绝');
    // 校验全部通过，以下同步提交无任何 await，重复完成或并发流转只会成功一次
    const completedAt = new Date().toISOString();
    record.status = MaintenanceStatus.Completed;
    record.cost = actualCost;
    record.completionMileage = completionMileage;
    record.completedAt = completedAt;
    this.vehicleService.updateMileage(vehicle.id, completionMileage);
    const hasOtherInProgress = this.rows.some((item: any) => item.vehicleId === record.vehicleId && item.id !== record.id && item.status === MaintenanceStatus.InProgress);
    if (!hasOtherInProgress) {
      this.vehicleService.transitionStatus(vehicle.id, VehicleStatus.Maintenance, VehicleStatus.Available);
    }
    const month = completedAt.slice(0, 7);
    const costSummary = this.costService.applyMaintenanceCost(record.vehicleId, month, actualCost);
    return { ...record, costSummary };
  }
}
