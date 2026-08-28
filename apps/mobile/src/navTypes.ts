import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Tabs: undefined;
  VendorDetail: { vendorId: string; vendorName?: string };
};

export type AppTabParamList = {
  Marketplace: undefined;
  Events: undefined;
  Bookings: undefined;
  Profile: undefined;
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;
