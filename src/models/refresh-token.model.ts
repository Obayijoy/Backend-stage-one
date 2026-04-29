import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

interface RefreshTokenAttributes {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  is_revoked: boolean;
  created_at: Date;
}

interface RefreshTokenCreationAttributes
  extends Optional<RefreshTokenAttributes, "id" | "is_revoked" | "created_at"> {}

class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  public id!: string;
  public user_id!: string;
  public token!: string;
  public expires_at!: Date;
  public is_revoked!: boolean;
  public created_at!: Date;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: "RefreshToken",
    tableName: "refresh_tokens",
    timestamps: false
  }
);

export default RefreshToken;