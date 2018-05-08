import {CommonService} from '../../common/common.service';
import {OrgQuota} from '../../model/org-quota';
import {OrgURLConstant} from './org.constant';
import {Injectable} from '@angular/core';
import {NGXLogger} from 'ngx-logger';

@Injectable()
export class OrgQuotaService {

  constructor(private common: CommonService, private logger: NGXLogger) {}

  private getToken() {
    return this.common.getToken();
  }

  public getOrgQuotaSample(): OrgQuota {
    const data = this.getOrgQuotaSample();
    const quota: OrgQuota = new OrgQuota(data['metadata'], data['entity']);

    return quota;
  }

  public getOrgQuota(orgId: string): OrgQuota {
    let quota: OrgQuota = OrgQuota.empty();
    const url: string = OrgURLConstant.URLOrgQuotaInformationHead + orgId + OrgURLConstant.URLOrgQuotaInformationTail;
    const observable = this.common.doGET(url, this.getToken());
    observable.subscribe(quotaData => {
      //quota = new OrgQuota(quotaData['metadata'], quotaData['entity']);
      if (quotaData.hasOwnProperty('metadata') && quotaData.hasOwnProperty('entity') ) {
        quota.fill(quotaData['metadata'], quotaData['entity']);
        this.logger.debug('OrgQuota :', quota);
      }
    });

    return quota;
  }

  public getOrgAvailableQuota(): Array<OrgQuota> {
    const quotas: Array<OrgQuota> = [];
    const url: string = OrgURLConstant.URLOrgAvailableQuotas + '';
    const observable = this.common.doGET(url, this.getToken());
    observable.subscribe(data => {
      if (data.hasOwnProperty('resources')) {
        (data['resources'] as Array<Object>).forEach(quotaData => {
          const index = quotas.push(new OrgQuota(quotaData['metadata'], quotaData['entity'])) - 1;
          this.logger.trace('Org available quota(', index, ') :', quotas[index]);
        });
      }
      this.logger.debug('OrgAvailableQuotas :', quotas);
    });

    return quotas;
  }

  private getSampleOrgQuota() {
    return {
      'entity': {
        'app_instance_limit': -1,
        'app_task_limit': -1,
        'instance_memory_limit': -1,
        'memory_limit': 20480,
        'name': '20G_quota',
        'non_basic_services_allowed': true,
        'total_private_domains': -1,
        'total_reserved_route_ports': 0,
        'total_routes': 2000,
        'total_service_keys': -1,
        'total_services': 100,
        'trial_db_allowed': false
      },
      'metadata': {
        'created_at': '2017-11-27T04:04:43Z',
        'guid': '31e846ad-8d8b-4d70-bd1a-5f7ae3aff3b1',
        'updated_at': '2017-11-27T04:04:43Z',
        'url': '/v2/quota_definitions/31e846ad-8d8b-4d70-bd1a-5f7ae3aff3b1'
      }
    };
  }
}
