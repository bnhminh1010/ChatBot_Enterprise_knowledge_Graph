export class AuthResponseDto {
  access_token: string;
  user: {
    id: string;
    email: string;
    hoTen: string;
    roles: string[];
  };
  expiresIn: number;
}
