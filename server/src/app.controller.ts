import { Body, Controller, Post } from '@nestjs/common';
import { AppService, ThoughtStrategies } from './app.service';

type ProfileBody = { query: string; tables: string[] };

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/profile')
  async postProfile(@Body() body: ProfileBody): Promise<ThoughtStrategies> {
    return this.appService.profile(body.query, body.tables);
  }
}
