import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
export class CreateHerbDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  img!: string;

  @IsOptional()
  @IsString()
  usageMethod!: string;

  @IsOptional()
  @IsString()
  cultivator?: string;
}
