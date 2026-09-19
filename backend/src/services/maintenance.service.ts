import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, VehicleStatus } from '../types/enums';
import { CompleteMaintenancePayload } from '../types/interfaces';
import { VehicleService } from './vehicle.service';
import { CostService } from './cost.service';
@Injectable()
export class MaintenanceService {
  private rows: any[] = [{ id: 1, vehicleId: 1, maintenanceType: 'Routine', item: '机油与制动检查', cost: 2100, vendor: '青浦维保站', date: '2026-06-06', nextMileage: 93000, nextDate: '2026-09-06', status: 'Completed' }];
  private transitioning = new Set<number>();
  constructor(private readonly vehicleService: VehicleService, private readonly costService: CostService) {}
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) {
    const row = { ...payload, id: this.rows.length + 1, status: MaintenanceStatus.Scheduled };
    this.rows.push(row);
    return row;
  }
  start(id: number) {
    const record = this.findOne(id);
    if (!record) throw new NotFoundException(`维保记录 ${id} 不存在`);
    const vehicle = this.vehicleService.findOne(record.vehicleId);
    if (!vehicle) throw new NotFoundException(`车辆 ${record.vehicleId} 不存在`);
    if (vehicle.status !== VehicleStatus.Available) throw new ConflictException(`车辆当前状态为 ${vehicle.status}，仅可用车辆允许开始维保`);
    this.acquire(id);
    const recordSnapshot = { ...record };
    const vehicleSnapshot = { ...vehicle };
    try {
      if (record.status !== MaintenanceStatus.Scheduled) throw new ConflictException(`维保单状态为 ${record.status}，仅待维保单据可开始，重复流转将被拒绝`);
      this.vehicleService.markUnderMaintenance(vehicle.id);
      record.status = MaintenanceStatus.InProgress;
      record.startedDate = new Date().toISOString().slice(0, 10);
      return record;
    } catch (error) {
      Object.assign(record, recordSnapshot);
      Object.assign(vehicle, vehicleSnapshot);
      throw error;
    } finally {
      this.release(id);
    }
  }
  complete(id: number, payload: CompleteMaintenancePayload) {
    const record = this.findOne(id);
    if (!record) throw new NotFoundException(`维保记录 ${id} 不存在`);
    const { actualCost, completionMileage, completionDate } = this.assertCompletePayload(payload);
    const vehicle = this.vehicleService.findOne(record.vehicleId);
    if (!vehicle) throw new NotFoundException(`车辆 ${record.vehicleId} 不存在`);
    if (completionMileage < vehicle.mileage) throw new BadRequestException(`完成里程 ${completionMileage} 小于车辆当前里程 ${vehicle.mileage}，整单拒绝`);
    const month = completionDate.slice(0, 7);
    this.acquire(id);
    const recordSnapshot = { ...record };
    const vehicleSnapshot = { ...vehicle };
    const summarySnapshot = this.costService.snapshotSummary(record.vehicleId, month);
    try {
      if (record.status !== MaintenanceStatus.InProgress) throw new ConflictException(`维保单状态为 ${record.status}，仅进行中单据可完成，重复完成将被拒绝`);
      record.status = MaintenanceStatus.Completed;
      record.cost = actualCost;
      record.completionMileage = completionMileage;
      record.completedDate = completionDate;
      this.vehicleService.updateMileage(vehicle.id, completionMileage);
      if (!this.hasOtherInProgress(record.vehicleId, record.id)) this.vehicleService.markAvailable(vehicle.id);
      this.costService.applyMaintenanceCost(record.vehicleId, month, actualCost);
      return record;
    } catch (error) {
      Object.assign(record, recordSnapshot);
      Object.assign(vehicle, vehicleSnapshot);
      this.costService.restoreSummary(record.vehicleId, month, summarySnapshot);
      throw error;
    } finally {
      this.release(id);
    }
  }
  private assertCompletePayload(payload: CompleteMaintenancePayload) {
    const actualCost = Number(payload?.actualCost);
    const completionMileage = Number(payload?.completionMileage);
    if (!Number.isFinite(actualCost) || actualCost < 0) throw new BadRequestException('完成维保必须提交有效的实际费用 actualCost（不小于 0 的数字）');
    if (!Number.isFinite(completionMileage) || completionMileage < 0) throw new BadRequestException('完成维保必须提交有效的完成里程 completionMileage（不小于 0 的数字）');
    let completionDate = new Date().toISOString().slice(0, 10);
    if (payload?.completionDate !== undefined) {
      if (typeof payload.completionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.completionDate)) throw new BadRequestException('completionDate 格式应为 YYYY-MM-DD');
      completionDate = payload.completionDate;
    }
    return { actualCost, completionMileage, completionDate };
  }
  private hasOtherInProgress(vehicleId: number, excludeId: number) {
    return this.rows.some((item: any) => item.vehicleId === vehicleId && item.id !== excludeId && item.status === MaintenanceStatus.InProgress);
  }
  private acquire(id: number) {
    if (this.transitioning.has(id)) throw new ConflictException(`维保单 ${id} 正在流转中，并发流转仅允许成功一次`);
    this.transitioning.add(id);
  }
  private release(id: number) { this.transitioning.delete(id); }
}
