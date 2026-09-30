import { Injectable, Logger } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';

@Injectable()
export class AssignmentProcessor {
  private readonly logger = new Logger(AssignmentProcessor.name);

  constructor(private readonly assignmentsService: AssignmentsService) {}

  async handleGenerate() {
    const created = await this.assignmentsService.runWeightedAssignmentCycle();
    this.logger.log(`Generated ${created.length} assignments`);
    return created;
  }
}
