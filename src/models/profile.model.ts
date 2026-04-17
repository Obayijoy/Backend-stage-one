import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db";

interface ProfileAttributes {
  id: string;
  name: string;
  gender: string;
  gender_probability: number;
  sample_size: number;
  age: number;
  age_group: string;
  country_id: string;
  country_probability: number;
  created_at: Date;
}

interface ProfileCreationAttributes extends Optional<ProfileAttributes, "id" | "created_at"> {}

class Profile
  extends Model<ProfileAttributes, ProfileCreationAttributes>
  implements ProfileAttributes
{
  public id!: string;
  public name!: string;
  public gender!: string;
  public gender_probability!: number;
  public sample_size!: number;
  public age!: number;
  public age_group!: string;
  public country_id!: string;
  public country_probability!: number;
  public created_at!: Date;
}

Profile.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false
    },
    gender_probability: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    sample_size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    age_group: {
      type: DataTypes.STRING,
      allowNull: false
    },
    country_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    country_probability: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    modelName: "Profile",
    tableName: "profiles",
    timestamps: false
  }
);

export default Profile;