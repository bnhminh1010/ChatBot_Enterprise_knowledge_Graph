/**
 * @fileoverview Login DTO - Authentication Request
 * @module auth/dto/login.dto
 * 
 * DTO cho login request với validation.
 * 
 * @author APTX3107 Team
 */
import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

/**
 * DTO cho login request.
 */
export class LoginDto {
  /** Email của user (required, valid email format) */
  @IsNotEmpty()
  @IsEmail()
  email: string;

  /** Password của user (required) */
  @IsNotEmpty()
  @IsString()
  password: string;
}
