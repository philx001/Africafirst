import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'contact@africafirst.com' })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({ example: 'MotDePasse123!' })
  @IsString()
  @MinLength(8, { message: 'Mot de passe minimum 8 caractères' })
  password: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'Africa First Agency' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  organizationName: string;

  @ApiProperty({ example: 'africa-first', description: 'Identifiant unique URL-friendly' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug : lettres minuscules, chiffres et tirets uniquement' })
  @MinLength(3)
  @MaxLength(50)
  organizationSlug: string;
}
