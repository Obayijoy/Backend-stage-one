import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

interface UserAttributes {
  id: string;
  github_id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  role: "admin" | "analyst";
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
}

interface UserCreationAttributes
  extends Optional<UserAttributes, "id" | "email" | "avatar_url" | "role" | "is_active" | "last_login_at" | "created_at"> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public github_id!: string;
  public username!: string;
  public email!: string | null;
  public avatar_url!: string | null;
  public role!: "admin" | "analyst";
  public is_active!: boolean;
  public last_login_at!: Date | null;
  public created_at!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false
    },
    github_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    avatar_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "analyst"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: false
  }
);

export default User;