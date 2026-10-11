-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: pos_system
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) DEFAULT NULL,
  `serial_number` varchar(100) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `unit` varchar(50) NOT NULL DEFAULT '????',
  `price` decimal(10,2) NOT NULL,
  `stock_quantity` decimal(10,2) NOT NULL DEFAULT 0.00,
  `storage_location` varchar(255) DEFAULT '',
  `carton_qty` int(11) DEFAULT 0,
  `carton_price` decimal(10,2) DEFAULT NULL,
  `carton_barcode` varchar(100) DEFAULT NULL,
  `box_qty` int(11) DEFAULT 0,
  `box_price` decimal(10,2) DEFAULT NULL,
  `box_barcode` varchar(100) DEFAULT NULL,
  `dozen_price` decimal(10,2) DEFAULT NULL,
  `dozen_barcode` varchar(100) DEFAULT NULL,
  `bulk_unit_name` varchar(50) DEFAULT NULL,
  `bulk_qty` int(11) DEFAULT 0,
  `bulk_barcode` varchar(100) DEFAULT NULL,
  `bulk_price` decimal(10,2) DEFAULT NULL,
  `is_liquid` tinyint(1) DEFAULT 0,
  `ml_per_bottle` int(11) DEFAULT 0,
  `bottle_price` decimal(10,2) DEFAULT NULL,
  `bottle_barcode` varchar(100) DEFAULT NULL,
  `bottles_per_box` int(11) DEFAULT 0,
  `box_price_liquid` decimal(10,2) DEFAULT NULL,
  `box_barcode_liquid` varchar(100) DEFAULT NULL,
  `uuid` varchar(36) DEFAULT NULL,
  `is_synced` tinyint(1) DEFAULT 0,
  `last_synced_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `serial_number` (`serial_number`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,NULL,'1','mazaj','قطعة',100.00,4.00,'',0,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,0,0,NULL,NULL,0,NULL,NULL,'38dc61dd-b6b4-11f1-b102-745d228e67cd',0,NULL),(2,2,'1234556777899000','shisha','قطعة',1000.00,9.00,'garden',0,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,0,0,NULL,NULL,0,NULL,NULL,'38dc6c66-b6b4-11f1-b102-745d228e67cd',0,NULL),(3,2,'6975589710654','mazaj2','علبة',9500.00,49.00,'محل',0,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,0,0,NULL,NULL,0,NULL,NULL,'38dc6d53-b6b4-11f1-b102-745d228e67cd',0,NULL),(4,NULL,NULL,'mazaj3','مل',300.00,15.00,'',0,NULL,NULL,0,NULL,NULL,NULL,NULL,NULL,0,NULL,NULL,1,30,9000.00,NULL,0,NULL,NULL,'38dc6dcd-b6b4-11f1-b102-745d228e67cd',0,NULL);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `products_before_insert`
            BEFORE INSERT ON `products`
            FOR EACH ROW
            BEGIN
                IF NEW.uuid IS NULL THEN
                    SET NEW.uuid = UUID();
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `products_before_update`
            BEFORE UPDATE ON `products`
            FOR EACH ROW
            BEGIN
                IF NEW.is_synced = OLD.is_synced THEN
                    SET NEW.is_synced = 0;
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `bills`
--

DROP TABLE IF EXISTS `bills`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bills` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('sale','purchase') NOT NULL,
  `payment_method` varchar(50) NOT NULL DEFAULT 'cash',
  `customer_id` int(11) DEFAULT NULL,
  `cashier_name` varchar(100) DEFAULT 'Main User',
  `total_amount` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) NOT NULL,
  `debt_amount` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `payment_method2` varchar(50) DEFAULT NULL,
  `paid_amount2` decimal(10,2) NOT NULL DEFAULT 0.00,
  `uuid` varchar(36) DEFAULT NULL,
  `is_synced` tinyint(1) DEFAULT 0,
  `last_synced_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `bills_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bills`
--

LOCK TABLES `bills` WRITE;
/*!40000 ALTER TABLE `bills` DISABLE KEYS */;
INSERT INTO `bills` VALUES (1,'sale','cash',2,'كاشير 1',3300.00,3300.00,0.00,'2026-09-18 15:36:09',NULL,0.00,'38e78618-b6b4-11f1-b102-745d228e67cd',0,NULL),(2,'sale','deposit',2,'كاشير 1',100.00,0.00,0.00,'2026-09-18 16:03:04',NULL,0.00,'38e78e03-b6b4-11f1-b102-745d228e67cd',0,NULL),(3,'sale','deposit',2,'كاشير 1',100.00,20.00,0.00,'2026-09-18 16:04:05',NULL,0.00,'38e78eb5-b6b4-11f1-b102-745d228e67cd',0,NULL),(4,'sale','deposit',2,'كاشير 1',100.00,0.00,0.00,'2026-09-18 16:15:35',NULL,0.00,'38e78f40-b6b4-11f1-b102-745d228e67cd',0,NULL),(5,'sale','deposit',4,'كاشير 1',2500.00,200.00,0.00,'2026-09-18 16:39:52',NULL,0.00,'38e78f91-b6b4-11f1-b102-745d228e67cd',0,NULL),(6,'sale','cash',5,'كاشير 1',200.00,200.00,0.00,'2026-09-20 15:04:03',NULL,0.00,'38e78fd9-b6b4-11f1-b102-745d228e67cd',0,NULL),(7,'sale','onecash',5,'كاشير 1',1000.00,500.00,0.00,'2026-09-20 15:08:12',NULL,0.00,'38e79025-b6b4-11f1-b102-745d228e67cd',0,NULL),(8,'sale','deposit',5,'كاشير 1',1000.00,300.00,0.00,'2026-09-20 15:14:17',NULL,0.00,'38e7906f-b6b4-11f1-b102-745d228e67cd',0,NULL),(9,'sale','deposit',5,'كاشير 1',1000.00,300.00,0.00,'2026-09-20 15:14:53',NULL,0.00,'38e790b9-b6b4-11f1-b102-745d228e67cd',0,NULL),(10,'sale','deposit',5,'كاشير 1',1000.00,300.00,0.00,'2026-09-20 15:15:10',NULL,0.00,'38e790ff-b6b4-11f1-b102-745d228e67cd',0,NULL),(11,'sale','cash',1,'كاشير 1',9500.00,9500.00,0.00,'2026-09-20 15:27:36',NULL,0.00,'38e79145-b6b4-11f1-b102-745d228e67cd',0,NULL),(12,'sale','cash',5,'كاشير 1',9500.00,2500.00,0.00,'2026-09-22 16:49:16','deposit',7000.00,'38e7918a-b6b4-11f1-b102-745d228e67cd',0,NULL),(13,'sale','card',5,'كاشير 1',9500.00,4750.00,0.00,'2026-09-22 16:53:01','cash',4750.00,'38e791d1-b6b4-11f1-b102-745d228e67cd',0,NULL),(14,'sale','cash',1,'كاشير 1',300.00,300.00,0.00,'2026-09-22 17:58:13',NULL,0.00,'38e7921a-b6b4-11f1-b102-745d228e67cd',0,NULL),(15,'sale','cash',1,'كاشير 1',1500.00,1500.00,0.00,'2026-09-22 17:59:06',NULL,0.00,'38e7925f-b6b4-11f1-b102-745d228e67cd',0,NULL),(16,'sale','deposit',6,'كاشير 1',600.00,300.00,0.00,'2026-09-24 12:07:46','kuraimi',300.00,'8e22b278-b810-11f1-af46-745d228e67cd',0,NULL),(17,'sale','deposit',6,'كاشير 1',300.00,0.00,0.00,'2026-09-24 12:08:37','kuraimi',300.00,'ac8d1a16-b810-11f1-af46-745d228e67cd',0,NULL),(18,'sale','cash',1,'كاشير 1',300.00,200.00,0.00,'2026-09-28 21:23:25','jeeb',100.00,'d74d038a-bb82-11f1-b0dc-745d228e67cd',0,NULL),(19,'sale','deposit',4,'كاشير 1',1000.00,0.00,0.00,'2026-09-28 21:28:37',NULL,0.00,'910a3be7-bb83-11f1-b0dc-745d228e67cd',0,NULL),(20,'sale','cash',1,'كاشير 1',19900.00,19900.00,0.00,'2026-10-11 18:36:45',NULL,0.00,'b5f0fa2a-c5a2-11f1-9df6-745d228e67cd',0,NULL);
/*!40000 ALTER TABLE `bills` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bills_before_insert`
            BEFORE INSERT ON `bills`
            FOR EACH ROW
            BEGIN
                IF NEW.uuid IS NULL THEN
                    SET NEW.uuid = UUID();
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bills_before_update`
            BEFORE UPDATE ON `bills`
            FOR EACH ROW
            BEGIN
                IF NEW.is_synced = OLD.is_synced THEN
                    SET NEW.is_synced = 0;
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `bill_items`
--

DROP TABLE IF EXISTS `bill_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bill_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `bill_id` int(11) DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `uuid` varchar(36) DEFAULT NULL,
  `is_synced` tinyint(1) DEFAULT 0,
  `last_synced_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `bill_id` (`bill_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `bill_items_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bills` (`id`),
  CONSTRAINT `bill_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bill_items`
--

LOCK TABLES `bill_items` WRITE;
/*!40000 ALTER TABLE `bill_items` DISABLE KEYS */;
INSERT INTO `bill_items` VALUES (1,1,1,33.00,100.00,3300.00,'38ed720b-b6b4-11f1-b102-745d228e67cd',0,NULL),(2,2,1,1.00,100.00,100.00,'38ed7a3c-b6b4-11f1-b102-745d228e67cd',0,NULL),(3,3,1,1.00,100.00,100.00,'38ed7b15-b6b4-11f1-b102-745d228e67cd',0,NULL),(4,4,1,1.00,100.00,100.00,'38ed7bc8-b6b4-11f1-b102-745d228e67cd',0,NULL),(5,5,2,2.00,1000.00,2000.00,'38ed7c33-b6b4-11f1-b102-745d228e67cd',0,NULL),(6,5,1,1.00,500.00,500.00,'38ed7c96-b6b4-11f1-b102-745d228e67cd',0,NULL),(7,6,1,2.00,100.00,200.00,'38ed7cfa-b6b4-11f1-b102-745d228e67cd',0,NULL),(8,7,2,1.00,1000.00,1000.00,'38ed7d59-b6b4-11f1-b102-745d228e67cd',0,NULL),(9,8,2,1.00,1000.00,1000.00,'38ed7db9-b6b4-11f1-b102-745d228e67cd',0,NULL),(10,9,2,1.00,1000.00,1000.00,'38ed7e19-b6b4-11f1-b102-745d228e67cd',0,NULL),(11,10,2,1.00,1000.00,1000.00,'38ed7e74-b6b4-11f1-b102-745d228e67cd',0,NULL),(12,11,3,1.00,9500.00,9500.00,'38ed7ed2-b6b4-11f1-b102-745d228e67cd',0,NULL),(13,12,3,1.00,9500.00,9500.00,'38ed7f2a-b6b4-11f1-b102-745d228e67cd',0,NULL),(14,13,3,1.00,9500.00,9500.00,'38ed7f75-b6b4-11f1-b102-745d228e67cd',0,NULL),(15,14,4,1.00,300.00,300.00,'38ed7fb4-b6b4-11f1-b102-745d228e67cd',0,NULL),(16,15,4,5.00,300.00,1500.00,'38ed7ff3-b6b4-11f1-b102-745d228e67cd',0,NULL),(17,16,4,2.00,300.00,600.00,'8e241b04-b810-11f1-af46-745d228e67cd',0,NULL),(18,17,4,1.00,300.00,300.00,'ac8d3432-b810-11f1-af46-745d228e67cd',0,NULL),(19,18,4,1.00,300.00,300.00,'d74d21ee-bb82-11f1-b0dc-745d228e67cd',0,NULL),(20,19,2,1.00,1000.00,1000.00,'910a5ae7-bb83-11f1-b0dc-745d228e67cd',0,NULL),(21,20,4,1.00,300.00,300.00,'b5f17faa-c5a2-11f1-9df6-745d228e67cd',0,NULL),(22,20,4,1.00,9000.00,9000.00,'b5f1e656-c5a2-11f1-9df6-745d228e67cd',0,NULL),(23,20,3,1.00,9500.00,9500.00,'b5f1f35a-c5a2-11f1-9df6-745d228e67cd',0,NULL),(24,20,2,1.00,1000.00,1000.00,'b5f20bb7-c5a2-11f1-9df6-745d228e67cd',0,NULL),(25,20,1,1.00,100.00,100.00,'b5f2acf0-c5a2-11f1-9df6-745d228e67cd',0,NULL);
/*!40000 ALTER TABLE `bill_items` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bill_items_before_insert`
            BEFORE INSERT ON `bill_items`
            FOR EACH ROW
            BEGIN
                IF NEW.uuid IS NULL THEN
                    SET NEW.uuid = UUID();
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `bill_items_before_update`
            BEFORE UPDATE ON `bill_items`
            FOR EACH ROW
            BEGIN
                IF NEW.is_synced = OLD.is_synced THEN
                    SET NEW.is_synced = 0;
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `type` enum('payment','debt') NOT NULL DEFAULT 'payment',
  `bill_id` int(11) DEFAULT NULL,
  `items_details` text DEFAULT NULL,
  `uuid` varchar(36) DEFAULT NULL,
  `is_synced` tinyint(1) DEFAULT 0,
  `last_synced_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,2,100.00,'سداد دفعة','2026-09-18 18:28:09','payment',NULL,NULL,'38f415e5-b6b4-11f1-b102-745d228e67cd',0,NULL),(2,5,500.00,'متبقي فاتورة مبيعات #7','2026-09-20 18:08:12','debt',7,'shisha (1 قطعة)','38f4171a-b6b4-11f1-b102-745d228e67cd',0,NULL),(3,5,1000.00,'متبقي فاتورة مبيعات #8','2026-09-20 18:14:17','debt',8,'shisha (1 قطعة)','38f417d7-b6b4-11f1-b102-745d228e67cd',0,NULL),(4,5,1000.00,'متبقي فاتورة مبيعات #9','2026-09-20 18:14:53','debt',9,'shisha (1 قطعة)','38f41833-b6b4-11f1-b102-745d228e67cd',0,NULL),(5,5,1000.00,'متبقي فاتورة مبيعات #10','2026-09-20 18:15:10','debt',10,'shisha (1 قطعة)','38f41881-b6b4-11f1-b102-745d228e67cd',0,NULL),(6,5,7000.00,'متبقي فاتورة مبيعات #12','2026-09-22 19:49:16','debt',12,'mazaj2 (1 علبة)','38f418ca-b6b4-11f1-b102-745d228e67cd',0,NULL),(7,6,300.00,'متبقي فاتورة مبيعات #16','2026-09-24 15:07:46','debt',16,'mazaj3 (2 مل)','8e244ef4-b810-11f1-af46-745d228e67cd',0,NULL),(8,6,300.00,'سداد دفعة','2026-09-24 15:12:56','payment',NULL,NULL,'46c09201-b811-11f1-af46-745d228e67cd',0,NULL),(9,6,500.00,'قيد دين جديد','2026-09-24 15:13:16','debt',NULL,'قيد دين جديد','52d8d6a3-b811-11f1-af46-745d228e67cd',0,NULL),(10,4,2300.00,'bitch','2026-09-29 00:27:51','payment',NULL,NULL,'75d9ff41-bb83-11f1-b0dc-745d228e67cd',0,NULL),(11,4,1000.00,'متبقي فاتورة مبيعات #19','2026-09-29 00:28:37','debt',19,'shisha (1 قطعة)','910a7e8a-bb83-11f1-b0dc-745d228e67cd',0,NULL),(12,4,1000.00,'سداد دفعة','2026-09-29 00:29:04','payment',NULL,NULL,'a145c900-bb83-11f1-b0dc-745d228e67cd',0,NULL),(13,4,200.00,'قيد دين جديد','2026-09-29 00:29:30','debt',NULL,'bitch','b0dee11e-bb83-11f1-b0dc-745d228e67cd',0,NULL);
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `payments_before_insert`
            BEFORE INSERT ON `payments`
            FOR EACH ROW
            BEGIN
                IF NEW.uuid IS NULL THEN
                    SET NEW.uuid = UUID();
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `payments_before_update`
            BEFORE UPDATE ON `payments`
            FOR EACH ROW
            BEGIN
                IF NEW.is_synced = OLD.is_synced THEN
                    SET NEW.is_synced = 0;
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `total_debt` decimal(10,2) DEFAULT 0.00,
  `uuid` varchar(36) DEFAULT NULL,
  `is_synced` tinyint(1) DEFAULT 0,
  `last_synced_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'Walk-in Customer / عميل نقدي','',0.00,'38d61ca4-b6b4-11f1-b102-745d228e67cd',0,NULL),(2,'haitham','715151560',180.00,'38d62448-b6b4-11f1-b102-745d228e67cd',0,NULL),(3,'haitham','',0.00,'38d6252e-b6b4-11f1-b102-745d228e67cd',0,NULL),(4,'aboood','775487233546',200.00,'38d625bd-b6b4-11f1-b102-745d228e67cd',0,NULL),(5,'fares ','777777777',10500.00,'38d62646-b6b4-11f1-b102-745d228e67cd',0,NULL),(6,'ادهم الهاجري','771639810',500.00,'8bfe2415-b810-11f1-af46-745d228e67cd',0,NULL);
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `customers_before_insert`
            BEFORE INSERT ON `customers`
            FOR EACH ROW
            BEGIN
                IF NEW.uuid IS NULL THEN
                    SET NEW.uuid = UUID();
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `customers_before_update`
            BEFORE UPDATE ON `customers`
            FOR EACH ROW
            BEGIN
                IF NEW.is_synced = OLD.is_synced THEN
                    SET NEW.is_synced = 0;
                END IF;
            END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-11 21:58:21
