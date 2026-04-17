import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  installJSI?: () => boolean;
  installJSIAsync?: () => Promise<boolean>;
}

export default TurboModuleRegistry.get<Spec>("PretextMeasure");
