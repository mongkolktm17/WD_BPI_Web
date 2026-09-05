-- AlterTable
ALTER TABLE "car_parkings" ADD COLUMN     "inspector_code" VARCHAR(20),
ADD COLUMN     "inspector_name" VARCHAR(100),
ADD COLUMN     "license_plates" TEXT,
ADD COLUMN     "motorcycle_count_1" INTEGER DEFAULT 0,
ADD COLUMN     "motorcycle_count_2" INTEGER DEFAULT 0,
ADD COLUMN     "motorcycle_count_3" INTEGER DEFAULT 0,
ADD COLUMN     "motorcycle_parking_lot" VARCHAR(100),
ADD COLUMN     "parking_lot" VARCHAR(100),
ADD COLUMN     "shift" VARCHAR(20),
ADD COLUMN     "spare_tire_status" VARCHAR(50),
ADD COLUMN     "total_cars" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email" VARCHAR(100),
ADD COLUMN     "phone" VARCHAR(20);
