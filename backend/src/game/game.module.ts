import { Module } from '@nestjs/common';
import { GameSessionService } from './game.session.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.websocket';

@Module({
  imports: [],
  controllers: [GameController],
  providers: [GameSessionService, GameGateway],
  exports: [GameSessionService],
})
export class GameModule {}
