-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 10, 2025 at 08:38 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `viyanta_web`
--

-- --------------------------------------------------------

--
-- Table structure for table `extracted_raw_data`
--

CREATE TABLE `extracted_raw_data` (
  `id` int(11) NOT NULL,
  `company` varchar(255) DEFAULT NULL,
  `form_no` varchar(50) DEFAULT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `table_rows` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`table_rows`)),
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `extracted_raw_data`
--

INSERT INTO `extracted_raw_data` (`id`, `company`, `form_no`, `filename`, `metadata`, `table_rows`, `uploaded_at`) VALUES
(1, 'sbi', 'L-1-A-REVENUE', 'SBI Life S FY2024 FY.pdf', '{\r\n    \"Form\": \"L-1-A-REVENUE\",\r\n    \"Title\": \"REVENUE ACCOUNT FOR THE QUARTER ENDED {QUARTER_END_DATE}\",\r\n    \"Period\": \"Period on page 2\",\r\n    \"PagesUsed\": 2,\r\n    \"Currency\": \"Rs in Lakhs\",\r\n    \"Headers\": [\r\n      \"Particulars\",\r\n      \"Schedule\",\r\n      \"Unit_Linked_Life\",\r\n      \"Unit_Linked_Pension\",\r\n      \"Unit_Linked_Total\",\r\n      \"Participating_Life\",\r\n      \"Participating_Pension\",\r\n      \"Participating_Var_Ins\",\r\n      \"Participating_Total\",\r\n      \"Non_Participating_Life\",\r\n      \"Non_Participating_Annuity\",\r\n      \"Non_Participating_Pension\",\r\n      \"Non_Participating_Health\",\r\n      \"Non_Participating_Var_Ins\",\r\n      \"Non_Participating_Total\",\r\n      \"Grand_Total\"\r\n    ]\r\n  }', '[\r\n    {\r\n      \"Particulars\": \"Total (C)\",\r\n      \"Schedule\": \"\",\r\n      \"Unit_Linked_Life\": \"13,96,680\",\r\n      \"Unit_Linked_Pension\": \"4,24,563\",\r\n      \"Unit_Linked_Total\": \"18,21,243\",\r\n      \"Participating_Life\": \"3,10,776\",\r\n      \"Participating_Pension\": \"19,024\",\r\n      \"Participating_Var_Ins\": \"2,233\",\r\n      \"Participating_Total\": \"3,32,033\",\r\n      \"Non_Participating_Life\": \"10,43,411\",\r\n      \"Non_Participating_Annuity\": \"1,87,068\",\r\n      \"Non_Participating_Pension\": \"(390)\",\r\n      \"Non_Participating_Health\": \"2,325\",\r\n      \"Non_Participating_Var_Ins\": \"4,329\",\r\n      \"Non_Participating_Total\": \"12,36,742\",\r\n      \"Grand_Total\": \"33,90,018\"\r\n    },\r\n    {\r\n      \"Particulars\": \"SURPLUS/ (DEFICIT) (D) = [(A)-(B)-(C)]\",\r\n      \"Schedule\": \"\",\r\n      \"Unit_Linked_Life\": \"26,543\",\r\n      \"Unit_Linked_Pension\": \"11,761\",\r\n      \"Unit_Linked_Total\": \"38,305\",\r\n      \"Participating_Life\": \"(19,027)\",\r\n      \"Participating_Pension\": \"(2,866)\",\r\n      \"Participating_Var_Ins\": \"1,896\",\r\n      \"Participating_Total\": \"(19,998)\",\r\n      \"Non_Participating_Life\": \"1,23,180\",\r\n      \"Non_Participating_Annuity\": \"20,922\",\r\n      \"Non_Participating_Pension\": \"1,401\",\r\n      \"Non_Participating_Health\": \"1,931\",\r\n      \"Non_Participating_Var_Ins\": \"5,253\",\r\n      \"Non_Participating_Total\": \"1,52,686\",\r\n      \"Grand_Total\": \"1,70,993\"\r\n    }\r\n  ]', '2025-09-09 06:47:43');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `extracted_raw_data`
--
ALTER TABLE `extracted_raw_data`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `extracted_raw_data`
--
ALTER TABLE `extracted_raw_data`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;




CREATE TABLE `extracted_refined_data` (
  `id` int(11) NOT NULL,
  `company` varchar(255) DEFAULT NULL,
  `form_no` varchar(50) DEFAULT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `table_rows` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`table_rows`)),
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
