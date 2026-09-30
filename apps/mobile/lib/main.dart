import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'screens/login_screen.dart';
import 'services/offline_inspection_queue.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await OfflineInspectionQueue.open();
  runApp(const DosjeApp());
}

class DosjeApp extends StatelessWidget {
  const DosjeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DoSJE Monitoring',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}
