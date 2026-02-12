import { Body, Controller, Post } from '@nestjs/common';
import { GameSessionService } from './game.session.service';
import { CreateGameDto } from './dto/create-game.dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameSessionService) {}

  @Post()
  create(@Body() body: CreateGameDto) {
    const size = Number(body.size);
    const diamonds = Number(body.diamonds);

    const game = this.gameService.createGame({ size, diamonds });
    return {
      id: game.id,
      size: game.size,
      diamonds: game.diamondAmount,
    };
  }
}
